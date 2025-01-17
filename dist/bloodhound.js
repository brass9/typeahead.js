
/*!
 * typeahead.js 0.2.0
 * Bloodhound Search Index
 * https://github.com/brass9/typeahead.js
 * Copyright 2013-2015 Twitter, Inc. and other contributors; Licensed MIT
 */

(function (root, factory) {
	if (typeof define === "function" && define.amd) {
		define("bloodhound", ["jquery", "$_"], function (a0, a1) {
			return root["Bloodhound"] = factory(a0, a1);
		});
	} else if (typeof exports === "object") {
		module.exports = factory(require("jquery", "$_"));
	} else {
		root["Bloodhound"] = factory(jQuery, $_);
	}
})(this, function ($, $_) {
	var VERSION = "0.2.0";


	var tokenizers = (function() {
	  'use strict';

	  return {
	    nonword: nonword,
	    whitespace: whitespace,
	    obj: {
	      nonword: getObjTokenizer(nonword),
	      whitespace: getObjTokenizer(whitespace)
	    }
	  };

	  function whitespace(str) {
	    str = $_.toStr(str);
	    return str ? str.split(/\s+/) : [];
	  }

	  function nonword(str) {
	    str = $_.toStr(str);
	    return str ? str.split(/\W+/) : [];
	  }

	  function getObjTokenizer(tokenizer) {
	    return function setKey(keys) {
	      keys = $_.isArray(keys) ? keys : [].slice.call(arguments, 0);

	      return function tokenize(o) {
	        var tokens = [];

	        $_.each(keys, function(k) {
	          tokens = tokens.concat(tokenizer($_.toStr(o[k])));
	        });

	        return tokens;
	      };
	    };
	  }
	})();

	var LruCache = (function() {
	  'use strict';

	  function LruCache(maxSize) {
	    this.maxSize = $_.isNumber(maxSize) ? maxSize : 100;
	    this.reset();

	    // if max size is less than 0, provide a noop cache
	    if (this.maxSize <= 0) {
	      this.set = this.get = $.noop;
	    }
	  }

	  $_.mixin(LruCache.prototype, {
	    set: function set(key, val) {
	      var tailItem = this.list.tail, node;

	      // at capacity
	      if (this.size >= this.maxSize) {
	        this.list.remove(tailItem);
	        delete this.hash[tailItem.key];

	        this.size--;
	      }

	      // writing over existing key
	      if (node = this.hash[key]) {
	        node.val = val;
	        this.list.moveToFront(node);
	      }

	      // new key
	      else {
	        node = new Node(key, val);

	        this.list.add(node);
	        this.hash[key] = node;

	        this.size++;
	      }
	    },

	    get: function get(key) {
	      var node = this.hash[key];

	      if (node) {
	        this.list.moveToFront(node);
	        return node.val;
	      }
	    },

	    reset: function reset() {
	      this.size = 0;
	      this.hash = {};
	      this.list = new List();
	    }
	  });

	  function List() {
	    this.head = this.tail = null;
	  }

	  $_.mixin(List.prototype, {
	    add: function add(node) {
	      if (this.head) {
	        node.next = this.head;
	        this.head.prev = node;
	      }

	      this.head = node;
	      this.tail = this.tail || node;
	    },

	    remove: function remove(node) {
	      node.prev ? node.prev.next = node.next : this.head = node.next;
	      node.next ? node.next.prev = node.prev : this.tail = node.prev;
	    },

	    moveToFront: function(node) {
	      this.remove(node);
	      this.add(node);
	    }
	  });

	  function Node(key, val) {
	    this.key = key;
	    this.val = val;
	    this.prev = this.next = null;
	  }

	  return LruCache;

	})();

	var PersistentStorage = (function() {
	  'use strict';

	  var LOCAL_STORAGE;

	  try {
	    LOCAL_STORAGE = window.localStorage;

	    // while in private browsing mode, some browsers make
	    // localStorage available, but throw an error when used
	    LOCAL_STORAGE.setItem('~~~', '!');
	    LOCAL_STORAGE.removeItem('~~~');
	  } catch (err) {
	    LOCAL_STORAGE = null;
	  }

	  // constructor
	  // -----------

	  function PersistentStorage(namespace, override) {
	    this.prefix = ['__', namespace, '__'].join('');
	    this.ttlKey = '__ttl__';
	    this.keyMatcher = new RegExp('^' + $_.escapeRegExChars(this.prefix));

	    // for testing purpose
	    this.ls = override || LOCAL_STORAGE;

	    // if local storage isn't available, everything becomes a noop
	    !this.ls && this._noop();
	  }

	  // instance methods
	  // ----------------

	  $_.mixin(PersistentStorage.prototype, {
	    // ### private

	    _prefix: function(key) {
	      return this.prefix + key;
	    },

	    _ttlKey: function(key) {
	      return this._prefix(key) + this.ttlKey;
	    },

	    _noop: function() {
	      this.get =
	      this.set =
	      this.remove =
	      this.clear =
	      this.isExpired = $_.noop;
	    },

	    _safeSet: function(key, val) {
	      try {
	        this.ls.setItem(key, val);
	      } catch (err) {
	        // hit the localstorage limit so clean up and better luck next time
	        if (err.name === 'QuotaExceededError') {
	          this.clear();
	          this._noop();
	        }
	      }
	    },

	    // ### public

	    get: function(key) {
	      if (this.isExpired(key)) {
	        this.remove(key);
	      }

	      return decode(this.ls.getItem(this._prefix(key)));
	    },

	    set: function(key, val, ttl) {
	      if ($_.isNumber(ttl)) {
	        this._safeSet(this._ttlKey(key), encode(now() + ttl));
	      }

	      else {
	        this.ls.removeItem(this._ttlKey(key));
	      }

	      return this._safeSet(this._prefix(key), encode(val));
	    },

	    remove: function(key) {
	      this.ls.removeItem(this._ttlKey(key));
	      this.ls.removeItem(this._prefix(key));

	      return this;
	    },

	    clear: function() {
	      var i, keys = gatherMatchingKeys(this.keyMatcher);

	      for (i = keys.length; i--;) {
	        this.remove(keys[i]);
	      }

	      return this;
	    },

	    isExpired: function(key) {
	      var ttl = decode(this.ls.getItem(this._ttlKey(key)));

	      return $_.isNumber(ttl) && now() > ttl ? true : false;
	    }
	  });

	  return PersistentStorage;

	  // helper functions
	  // ----------------

	  function now() {
	    return new Date().getTime();
	  }

	  function encode(val) {
	    // convert undefined to null to avoid issues with JSON.parse
	    return JSON.stringify($_.isUndefined(val) ? null : val);
	  }

	  function decode(val) {
	    return JSON.parse(val);
	  }

	  function gatherMatchingKeys(keyMatcher) {
	    var i, key, keys = [], len = LOCAL_STORAGE.length;

	    for (i = 0; i < len; i++) {
	      if ((key = LOCAL_STORAGE.key(i)).match(keyMatcher)) {
	        keys.push(key.replace(keyMatcher, ''));
	      }
	    }

	    return keys;
	  }
	})();

	var Transport = (function() {
	  'use strict';

	  var pendingRequestsCount = 0,
	      pendingRequests = {},
	      maxPendingRequests = 6,
	      sharedCache = new LruCache(10);

	  // constructor
	  // -----------

	  function Transport(o) {
	    o = o || {};

	    this.cancelled = false;
	    this.lastReq = null;

	    this._send = o.transport;
	    this._get = o.limiter ? o.limiter(this._get) : this._get;

	    this._cache = o.cache === false ? new LruCache(0) : sharedCache;
	  }

	  // static methods
	  // --------------

	  Transport.setMaxPendingRequests = function setMaxPendingRequests(num) {
	    maxPendingRequests = num;
	  };

	  Transport.resetCache = function resetCache() {
	    sharedCache.reset();
	  };

	  // instance methods
	  // ----------------

	  $_.mixin(Transport.prototype, {

	    // ### private

	    _fingerprint: function fingerprint(o) {
	      o = o || {};
	      return o.url + o.type + $.param(o.data || {});
	    },

	    _get: function(o, cb) {
	      var that = this, fingerprint, jqXhr;

	      fingerprint = this._fingerprint(o);

	      // #149: don't make a network request if there has been a cancellation
	      // or if the url doesn't match the last url Transport#get was invoked with
	      if (this.cancelled || fingerprint !== this.lastReq) { return; }

	      // a request is already in progress, piggyback off of it
	      if (jqXhr = pendingRequests[fingerprint]) {
	        jqXhr.done(done).fail(fail);
	      }

	      // under the pending request threshold, so fire off a request
	      else if (pendingRequestsCount < maxPendingRequests) {
	        pendingRequestsCount++;
	        pendingRequests[fingerprint] =
	          this._send(o).done(done).fail(fail).always(always);
	      }

	      // at the pending request threshold, so hang out in the on deck circle
	      else {
	        this.onDeckRequestArgs = [].slice.call(arguments, 0);
	      }

	      function done(resp) {
	        cb(null, resp);
	        that._cache.set(fingerprint, resp);
	      }

	      function fail() {
	        cb(true);
	      }

	      function always() {
	        pendingRequestsCount--;
	        delete pendingRequests[fingerprint];

	        // ensures request is always made for the last query
	        if (that.onDeckRequestArgs) {
	          that._get.apply(that, that.onDeckRequestArgs);
	          that.onDeckRequestArgs = null;
	        }
	      }
	    },

	    // ### public

	    get: function(o, cb) {
	      var resp, fingerprint;

	      cb = cb || $.noop;
	      o = $_.isString(o) ? { url: o } : (o || {});

	      fingerprint = this._fingerprint(o);

	      this.cancelled = false;
	      this.lastReq = fingerprint;

	      // in-memory cache hit
	      if (resp = this._cache.get(fingerprint)) {
	        cb(null, resp);
	      }

	      // go to network
	      else {
	        this._get(o, cb);
	      }
	    },

	    cancel: function() {
	      this.cancelled = true;
	    }
	  });

	  return Transport;
	})();

	var SearchIndex = window.SearchIndex = (function() {
	  'use strict';

	  var CHILDREN = 'c', IDS = 'i';

	  // constructor
	  // -----------
	  /**
	   * @param {SearchIndexOptions} o
	   */
	  function SearchIndex(o) {
	    o = o || {};

	    this.identify = o.identify || $_.stringify;
	    this.datumTokenizer = o.datumTokenizer || Bloodhound.tokenizers.whitespace;
	    this.queryTokenizer = o.queryTokenizer || Bloodhound.tokenizers.whitespace;
	    this.shouldMatchAnyToken = o.shouldMatchAnyToken || false;
	    this.shouldStartAnyChar = o.shouldStartAnyChar || false;

	    this.reset();
	  }

	  // instance methods
	  // ----------------

	  $_.mixin(SearchIndex.prototype, {

	    // ### public

	    bootstrap: function bootstrap(o) {
	      this.datums = o.datums;
	      this.trie = o.trie;
	    },

	    add: function(data) {
	      var that = this;

	      data = $_.isArray(data) ? data : [data];

	      $_.each(data, function(datum) {
	        var id, tokens;

	        that.datums[id = that.identify(datum)] = datum;
	        tokens = normalizeTokens(that.datumTokenizer(datum));

	        $_.each(tokens, function(token) {
	          var node, chars, ch;

	          node = that.trie;
	          chars = token.split('');

	          while (ch = chars.shift()) {
	            node = node[CHILDREN][ch] || (node[CHILDREN][ch] = newNode());
	            node[IDS].push(id);
	          }
	        });
	      });
	    },

	    get: function get(ids) {
	      var that = this;

	      return $_.map(ids, function(id) { return that.datums[id]; });
	    },

	    search: function search(query) {
	      const that = this;
	      let matches = null;
	      const tokens = normalizeTokens(this.queryTokenizer(query));

	      tokens.forEach(token => {
	        let node, chars, ch, ids;

	        if (
	          !that.shouldMatchAnyToken &&
	          // previous tokens didn't share any matches
	          matches && matches.length === 0
	        ) {
	          return false;
	        }

	        node = that.trie;
	        chars = token.split('');

	        if (that.shouldStartAnyChar) {
	          let charsLeft = 0;
	          for (let startingIndex = 0; startingIndex < chars.length; startingIndex++) {
	            let charIndex = startingIndex;
	            let charsLeft = chars.length - startingIndex;
	            while (node && charsLeft--) {
	              ch = chars[charIndex++];
	              node = node[CHILDREN][ch];
	            }

	            if (node && charsLeft == -1)
	              break;  // We got a match! break

	            node = that.trie;
	          }

	          if (charsLeft == 0)
	            chars = ''; // Hack to mimic the way fast-break version signaled match works for now
	        } else {
	          while (node && (ch = chars.shift())) {
	            node = node[CHILDREN][ch];
	          }
	        }

	        if (node && chars.length === 0) {
	          ids = node[IDS];
	          // shouldMatchAnyToken is simple - if it matches any token in the query, it's a match. union each time.
	          if (that.shouldMatchAnyToken)
	            matches = union(matches || [], ids);
	          else if (matches) // The default, non-shouldMatchAnyToken is complicated. matches begins null, and if the first query token doesn't match, it fails out early. It will not allow a match on say, the second word in a sentence
	            matches = intersection(matches, ids);
	          else  // default, non-shouldMatchAnyToken initializes matches and allows continued searching by copying ids here, if and only if the first query token is a match
	            matches = Array.from(ids);

	        } else if (!that.shouldMatchAnyToken) {
	          // break early if we find out there are no possible matches
	          matches = [];
	          return false;
	        }
	      });

	      return matches ?
	        $_.map(unique(matches), function(id) { return that.datums[id]; }) : [];
	    },

	    all: function all() {
	      var values = [];

	      for (var key in this.datums) {
	        values.push(this.datums[key]);
	      }

	      return values;
	    },

	    reset: function reset() {
	      this.datums = {};
	      this.trie = newNode();
	    },

	    serialize: function serialize() {
	      return { datums: this.datums, trie: this.trie };
	    }
	  });

	  return SearchIndex;

	  // helper functions
	  // ----------------

	  function normalizeTokens(tokens) {
	   // filter out falsy tokens
	    tokens = $_.filter(tokens, function(token) { return !!token; });

	    // normalize tokens
	    tokens = $_.map(tokens, function(token) { return token.toLowerCase(); });

	    return tokens;
	  }

	  function newNode() {
	    var node = {};

	    node[IDS] = [];
	    node[CHILDREN] = {};

	    return node;
	  }

	  function unique(array) {
	    const jsSet = new Set(array);
	    const uniques = Array.from(jsSet);
	    return uniques;
	  }

	  function intersection(arrayA, arrayB) {
	    const jsSetA = new Set(arrayA);
	    const result = [];

	    jsSetA.forEach(a => {
	      if (arrayB.includes(a))
	        result.push(a);
	    });

	    return result;
	  }

	  function union(arrayA, arrayB) {
	    const jsSet = new Set(arrayA);
	    arrayB.forEach(b => jsSet.add(b));
	    return Array.from(jsSet);
	  }
	})();

	var Prefetch = (function() {
	  'use strict';

	  var keys;

	  keys = { data: 'data', protocol: 'protocol', thumbprint: 'thumbprint' };

	  // constructor
	  // -----------

	  // defaults for options are handled in options_parser
	  function Prefetch(o) {
	    this.url = o.url;
	    this.ttl = o.ttl;
	    this.cache = o.cache;
	    this.prepare = o.prepare;
	    this.transform = o.transform;
	    this.transport = o.transport;
	    this.thumbprint = o.thumbprint;

	    this.storage = new PersistentStorage(o.cacheKey);
	  }

	  // instance methods
	  // ----------------

	  $_.mixin(Prefetch.prototype, {

	    // ### private

	    _settings: function settings() {
	      return { url: this.url, type: 'GET', dataType: 'json' };
	    },

	    // ### public

	    store: function store(data) {
	      if (!this.cache) { return; }

	      this.storage.set(keys.data, data, this.ttl);
	      this.storage.set(keys.protocol, location.protocol, this.ttl);
	      this.storage.set(keys.thumbprint, this.thumbprint, this.ttl);
	    },

	    fromCache: function fromCache() {
	      var stored = {}, isExpired;

	      if (!this.cache) { return null; }

	      stored.data = this.storage.get(keys.data);
	      stored.protocol = this.storage.get(keys.protocol);
	      stored.thumbprint = this.storage.get(keys.thumbprint);

	      // the stored data is considered expired if the thumbprints
	      // don't match or if the protocol it was originally stored under
	      // has changed
	      isExpired =
	        stored.thumbprint !== this.thumbprint ||
	        stored.protocol !== location.protocol;

	      // TODO: if expired, remove from local storage

	      return stored.data && !isExpired ? stored.data : null;
	    },

	    fromNetwork: function(cb) {
	      var that = this, settings;

	      if (!cb) { return; }

	      settings = this.prepare(this._settings());
	      this.transport(settings).fail(onError).done(onResponse);

	      function onError() { cb(true); }
	      function onResponse(resp) { cb(null, that.transform(resp)); }
	    },

	    clear: function clear() {
	      this.storage.clear();
	      return this;
	    }
	  });

	  return Prefetch;
	})();

	var Remote = (function() {
	  'use strict';

	  // constructor
	  // -----------

	  function Remote(o) {
	    this.url = o.url;
	    this.prepare = o.prepare;
	    this.transform = o.transform;

	    this.transport = new Transport({
	      cache: o.cache,
	      limiter: o.limiter,
	      transport: o.transport
	    });
	  }

	  // instance methods
	  // ----------------

	  $_.mixin(Remote.prototype, {
	    // ### private

	    _settings: function settings() {
	      return { url: this.url, type: 'GET', dataType: 'json' };
	    },

	    // ### public

	    get: function get(query, cb) {
	      var that = this, settings;

	      if (!cb) { return; }

	      query = query || '';
	      settings = this.prepare(query, this._settings());

	      return this.transport.get(settings, onResponse);

	      function onResponse(err, resp) {
	        err ? cb([]) : cb(that.transform(resp));
	      }
	    },

	    cancelLastRequest: function cancelLastRequest() {
	      this.transport.cancel();
	    }
	  });

	  return Remote;
	})();

	var oParser = (function() {
	  'use strict';

	  return function parse(o) {
	    var defaults, sorter;

	    defaults = {
	      initialize: true,
	      identify: $_.stringify,
	      datumTokenizer: null,
	      queryTokenizer: null,
	      sufficient: 5,
	      sorter: null,
	      local: [],
	      prefetch: null,
	      remote: null
	    };

	    o = $_.mixin(defaults, o || {});

	    // throw error if required options are not set
	    !o.datumTokenizer && $.error('datumTokenizer is required');
	    !o.queryTokenizer && $.error('queryTokenizer is required');

	    sorter = o.sorter;
	    o.sorter = sorter ? function(x) { return x.sort(sorter); } : $_.identity;

	    o.local = $_.isFunction(o.local) ? o.local() : o.local;
	    o.prefetch = parsePrefetch(o.prefetch);
	    o.remote = parseRemote(o.remote);

	    return o;
	  };

	  function parsePrefetch(o) {
	    var defaults;

	    if (!o) { return null; }

	    defaults = {
	      url: null,
	      ttl: 24 * 60 * 60 * 1000, // 1 day
	      cache: true,
	      cacheKey: null,
	      thumbprint: '',
	      prepare: $_.identity,
	      transform: $_.identity,
	      transport: null
	    };

	    // support basic (url) and advanced configuration
	    o = $_.isString(o) ? { url: o } : o;
	    o = $_.mixin(defaults, o);

	    // throw error if required options are not set
	    !o.url && $.error('prefetch requires url to be set');

	    // DEPRECATED: filter will be dropped in v1
	    o.transform = o.filter || o.transform;

	    o.cacheKey = o.cacheKey || o.url;
	    o.thumbprint = VERSION + o.thumbprint;
	    o.transport = o.transport ? callbackToDeferred(o.transport) : $.ajax;

	    return o;
	  }

	  function parseRemote(o) {
	    var defaults;

	    if (!o) { return; }

	    defaults = {
	      url: null,
	      cache: true, // leave undocumented
	      prepare: null,
	      replace: null,
	      wildcard: null,
	      limiter: null,
	      rateLimitBy: 'debounce',
	      rateLimitWait: 300,
	      transform: $_.identity,
	      transport: null
	    };

	    // support basic (url) and advanced configuration
	    o = $_.isString(o) ? { url: o } : o;
	    o = $_.mixin(defaults, o);

	    // throw error if required options are not set
	    !o.url && $.error('remote requires url to be set');

	    // DEPRECATED: filter will be dropped in v1
	    o.transform = o.filter || o.transform;

	    o.prepare = toRemotePrepare(o);
	    o.limiter = toLimiter(o);
	    o.transport = o.transport ? callbackToDeferred(o.transport) : $.ajax;

	    delete o.replace;
	    delete o.wildcard;
	    delete o.rateLimitBy;
	    delete o.rateLimitWait;

	    return o;
	  }

	  function toRemotePrepare(o) {
	    var prepare, replace, wildcard;

	    prepare = o.prepare;
	    replace = o.replace;
	    wildcard = o.wildcard;

	    if (prepare) { return prepare; }

	    if (replace) {
	      prepare = prepareByReplace;
	    }

	    else if (o.wildcard) {
	      prepare = prepareByWildcard;
	    }

	    else {
	      prepare = idenityPrepare;
	    }

	    return prepare;

	    function prepareByReplace(query, settings) {
	      settings.url = replace(settings.url, query);
	      return settings;
	    }

	    function prepareByWildcard(query, settings) {
	      settings.url = settings.url.replace(wildcard, encodeURIComponent(query));
	      return settings;
	    }

	    function idenityPrepare(query, settings) {
	      return settings;
	    }
	  }

	  function toLimiter(o) {
	    var limiter, method, wait;

	    limiter = o.limiter;
	    method = o.rateLimitBy;
	    wait = o.rateLimitWait;

	    if (!limiter) {
	      limiter = /^throttle$/i.test(method) ? throttle(wait) : debounce(wait);
	    }

	    return limiter;

	    function debounce(wait) {
	      return function debounce(fn) { return $_.debounce(fn, wait); };
	    }

	    function throttle(wait) {
	      return function throttle(fn) { return $_.throttle(fn, wait); };
	    }
	  }

	  function callbackToDeferred(fn) {
	    return function wrapper(o) {
	      var deferred = $.Deferred();

	      fn(o, onSuccess, onError);

	      return deferred;

	      function onSuccess(resp) {
	        // defer in case fn is synchronous, otherwise done
	        // and always handlers will be attached after the resolution
	        $_.defer(function() { deferred.resolve(resp); });
	      }

	      function onError(err) {
	        // defer in case fn is synchronous, otherwise done
	        // and always handlers will be attached after the resolution
	        $_.defer(function() { deferred.reject(err); });
	      }
	    };
	  }
	})();

	var Bloodhound = (function() {
	  'use strict';

	  var old;

	  old = window && window.Bloodhound;

	  // constructor
	  // -----------

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


	return Bloodhound;
});

