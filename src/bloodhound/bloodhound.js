/*
 * typeahead.js
 * https://github.com/twitter/typeahead.js
 * Copyright 2013-2014 Twitter, Inc. and other contributors; Licensed MIT
 */

/**
 * @typedef BloodhoundOptions
 * @property {SearchIndexIdentify} identify
 * @property {SearchIndexTokenizer} datumTokenizer
 * @property {SearchIndexTokenizer} queryTokenizer
 * @property {string|object} local
 * @property {string|NetworkOptions} prefetch
 * @property {string|RemoteOptions} remote
 * @property {Function} sorter  The sort comparison function.
 * @property {Number} sufficient Default 5. int - positive number stating how many typeahead entries to attempt to show.
 * @property {boolean}  shouldMatchAnyToken See SearchIndex
 * @property {boolean}  shouldStartAnyChar  See SearchIndex
 *
 * @typedef NetworkOptions
 * @property {string}   url    The url for this remote/prefetch. If instead of an object, you pass a string, it's as though you passed an object with only this property.
 * @property {boolean}  cache  Defaults to true. Whether to cache.
 * @property {function} prepare Allows you to modify the ajax instance before it sends its request
 * @property {Function} transform Allows you to modify the results before the framework injests them
 * @property {}
 * 
 * @typedef RemoteOptions
 * @extends NetworkOptions
 * @property {string}   wildcard  The string to replace with the given query. For example if your search API endpoint is /search and takes a param q, you might set url to '/search?q=query' and wildcard to 'query'.
 * @property {function} replace   An alternative to prepare or wildcard. All 3 build a prepare function. Wildcard takes a simple string and interrupts the least. Replace is a middle ground, allowing you to work on the URL but nothing else. prepare supercedes both and lets you work on the entire AJAX call before it goes out.
 * 
 * @callback SorterOption See Array.sort() in Javascript language definition; the Comparer, called compareFn in
 * Moz docs, is exactly what this option is.
 * Note: If the data you return to a given part of Bloodhound is itself a class with a custom .sort() function, then:
 * 1. You must pass a .sorter here in options to trigger the .sort() to be called, but
 * 2. You then don't need to do anything with this method - you could just pass true. Anything that evaluates to true
 * will cause your custom .sort() to be called
 * Note: If you read .sorter after setting it, it's a bit confusing. Your sorter is curried into a sort function,
 * such that bloodhound.sorter != o.sorter. Instead bloodhound.sorter = data => data.sort(o.sorter)
 * @template TDataItem
 * @param {TDataItem} a
 * @param {TDataItem} b
 * @returns {Number}  An int indicating whether a comes before b (negative), or after (positive).
 * 
 */

var Bloodhound = (function() {
  'use strict';

  var old;

  old = window && window.Bloodhound;


  /**
   * See also SearchIndex - many BloodhoundOptions are simply passed-thru to it.
   * @param {BloodhoundOptions} o
   */
  function Bloodhound(o) {
    o = oParser(o);

    this.sorter = o.sorter;
    this.identify = o.identify;
    this.sufficient = o.sufficient;

    this.local = o.local;
    this.remote = o.remote ? new Remote(o.remote) : null;
    this.prefetch = o.prefetch ? new Prefetch(o.prefetch) : null;

    this.index = new SearchIndex({
      identify: this.identify,
      datumTokenizer: o.datumTokenizer,
      queryTokenizer: o.queryTokenizer,
      shouldMatchAnyToken: o.shouldMatchAnyToken,
      shouldStartAnyChar: o.shouldStartAnyChar,
    });

    // hold off on intialization if the intialize option was explicitly false
    o.initialize !== false && this.initialize();
  }

  // static methods
  // --------------

  Bloodhound.noConflict = function noConflict() {
    window && (window.Bloodhound = old);
    return Bloodhound;
  };

  Bloodhound.tokenizers = tokenizers;

  // instance methods
  // ----------------

  $_.mixin(Bloodhound.prototype, {

    // ### super secret stuff used for integration with jquery plugin

    __ttAdapter: function ttAdapter() {
      var that = this;

      return this.remote ? withAsync : withoutAsync;

      function withAsync(query, sync, async) {
        return that.search(query, sync, async);
      }

      function withoutAsync(query, sync) {
        return that.search(query, sync);
      }
    },

    // ### private

    _loadPrefetch: function loadPrefetch() {
      var that = this, deferred, serialized;

      deferred = $.Deferred();

      if (!this.prefetch) {
        deferred.resolve();
      }

      else if (serialized = this.prefetch.fromCache()) {
        this.index.bootstrap(serialized);
        deferred.resolve();
      }

      else {
        this.prefetch.fromNetwork(done);
      }

      return deferred.promise();

      function done(err, data) {
        if (err) { return deferred.reject(); }

        that.add(data);
        that.prefetch.store(that.index.serialize());
        deferred.resolve();
      }
    },

    _initialize: function initialize() {
      var that = this, deferred;

      // in case this is a reinitialization, clear previous data
      this.clear();

      (this.initPromise = this._loadPrefetch())
      .done(addLocalToIndex); // local must be added to index after prefetch

      return this.initPromise;

      function addLocalToIndex() { that.add(that.local); }
    },

    // ### public

    initialize: function initialize(force) {
      return !this.initPromise || force ? this._initialize() : this.initPromise;
    },

    // TODO: before initialize what happens?
    add: function add(data) {
      this.index.add(data);
      return this;
    },

    get: function get(ids) {
      ids = $_.isArray(ids) ? ids : [].slice.call(arguments);
      return this.index.get(ids);
    },

    search: function search(query, sync, async) {
      var that = this, local;

      local = this.sorter(this.index.search(query));

      // return a copy to guarantee no changes within this scope
      // as this array will get used when processing the remote results
      sync(this.remote ? local.slice() : local);

      if (this.remote && local.length < this.sufficient) {
        this.remote.get(query, processRemote);
      }

      else if (this.remote) {
        // #149: prevents outdated rate-limited requests from being sent
        this.remote.cancelLastRequest();
      }

      return this;

      function processRemote(remote) {
        var nonDuplicates = [];

        // exclude duplicates
        $_.each(remote, function(r) {
           !$_.some(local, function(l) {
            return that.identify(r) === that.identify(l);
          }) && nonDuplicates.push(r);
        });

        async && async(nonDuplicates);
      }
    },

    all: function all() {
      return this.index.all();
    },

    clear: function clear() {
      this.index.reset();
      return this;
    },

    clearPrefetchCache: function clearPrefetchCache() {
      this.prefetch && this.prefetch.clear();
      return this;
    },

    clearRemoteCache: function clearRemoteCache() {
      Transport.resetCache();
      return this;
    },

    // DEPRECATED: will be removed in v1
    ttAdapter: function ttAdapter() {
      return this.__ttAdapter();
    }
  });

  return Bloodhound;
})();
