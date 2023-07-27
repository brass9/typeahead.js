/*
 * typeahead.js
 * https://github.com/twitter/typeahead.js
 * Copyright 2013-2014 Twitter, Inc. and other contributors; Licensed MIT
 */

/**
 * @callback SearchIndexIdentify  Used to get the ID property from object search result data
 * @param {object}    d   The object being checked from search result data
 * @returns {object}      Any identifier that is unique across all data passed to this SearchIndex. Does not need to be meaningful otherwise. Used to identify unique entries in SearchIndex. Could be an int id counter, a hash result, etc.
 * 
 * @callback SearchIndexTokenizer Used to normalize queries and data, and split them into "tokens" - usually words broken up at space characters
 * @param {string}    q   The string to be tokenized, for example the query the user has typed so far like "Ford F-15"
 * @returns {string[]}    The normalized, split string, for example ['Ford', 'F15']
 * 
 * @typedef {Object} SearchIndexOptions
 * @property {SearchIndexIdentify}   identify
 * @property {SearchIndexTokenizer}  datumTokenizer
 * @property {SearchIndexTokenizer}  queryTokenizer
 * @property {boolean}               shouldMatchAnyToken  Default: false. If false, only matches if first token (word) in query matches first token in result. If true, matches if any token matches any token.
 * @property {boolean}               shouldStartAnyChar   Default: false. If false, only matches if first character in query token matches first character result token. If true, matches query anywhere in result token.
 */

/**
 * Compiles characters in a given string into an Index - a tree of characters that represent the remaining possible paths forward in the data
 */
var SearchIndex = window.SearchIndex = (function() {
  'use strict';

  var CHILDREN = 'c', IDS = 'i';

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
