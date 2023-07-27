
/*!
 * typeahead.js 0.2.0
 * Typeahead Search Box UI
 * https://github.com/brass9/typeahead.js
 * Copyright 2013-2015 Twitter, Inc. and other contributors; Licensed MIT
 */

(function (root, factory) {
	if (typeof define === "function" && define.amd) {
		define("typeahead.js", ["jquery", "$_"], function (a0, a1) {
			return factory(a0, a1);
		});
	} else if (typeof exports === "object") {
		module.exports = factory(require("jquery", "$_"));
	} else {
		factory(jQuery, $_);
	}
})(this, function ($, $_) {

	var WWW = (function() {
	  'use strict';

	  var defaultClassNames = {
	    wrapper: 'twitter-typeahead',
	    input: 'tt-input',
	    hint: 'tt-hint',
	    menu: 'tt-menu',
	    dataset: 'tt-dataset',
	    suggestion: 'tt-suggestion',
	    selectable: 'tt-selectable',
	    empty: 'tt-empty',
	    open: 'tt-open',
	    cursor: 'tt-cursor',
	    highlight: 'tt-highlight'
	  };

	  return build;

	  function build(o) {
	    var www, classes;

	    classes = $_.mixin({}, defaultClassNames, o);

	    www = {
	      css: buildCss(),
	      classes: classes,
	      html: buildHtml(classes),
	      selectors: buildSelectors(classes)
	    };

	    return {
	      css: www.css,
	      html: www.html,
	      classes: www.classes,
	      selectors: www.selectors,
	      mixin: function(o) { $_.mixin(o, www); }
	    };
	  }

	  function buildHtml(c) {
	    return {
	      wrapper: '<span class="' + c.wrapper + '"></span>',
	      menu: '<div class="' + c.menu + '"></div>'
	    };
	  }

	  function buildSelectors(classes) {
	    var selectors = {};
	    $_.each(classes, function(v, k) { selectors[k] = '.' + v; });

	    return selectors;
	  }

	  function buildCss() {
	    var css =  {
	      wrapper: {
	        position: 'relative',
	        display: 'inline-block'
	      },
	      hint: {
	        position: 'absolute',
	        top: '0',
	        left: '0',
	        borderColor: 'transparent',
	        boxShadow: 'none',
	        // #741: fix hint opacity issue on iOS
	        opacity: '1'
	      },
	      input: {
	        position: 'relative',
	        verticalAlign: 'top',
	        backgroundColor: 'transparent'
	      },
	      inputWithNoHint: {
	        position: 'relative',
	        verticalAlign: 'top'
	      },
	      menu: {
	        position: 'absolute',
	        top: '100%',
	        left: '0',
	        zIndex: '100',
	        display: 'none'
	      },
	      ltr: {
	        left: '0',
	        right: 'auto'
	      },
	      rtl: {
	        left: 'auto',
	        right:' 0'
	      }
	    };

	    return css;
	  }
	})();
	var EventBus = (function() {
	  'use strict';

	  var namespace, deprecationMap;

	  namespace = 'typeahead:';

	  // DEPRECATED: will be remove in v1
	  //
	  // NOTE: there is no deprecation plan for the opened and closed event
	  // as their behavior has changed enough that it wouldn't make sense
	  deprecationMap = {
	    render: 'rendered',
	    cursorchange: 'cursorchanged',
	    select: 'selected',
	    autocomplete: 'autocompleted'
	  };

	  // constructor
	  // -----------

	  function EventBus(o) {
	    if (!o || !o.el) {
	      $.error('EventBus initialized without el');
	    }

	    this.$el = $(o.el);
	  }

	  // instance methods
	  // ----------------

	  $_.mixin(EventBus.prototype, {

	    // ### private

	    _trigger: function(type, args) {
	      var $e;

	      $e = $.Event(namespace + type);
	      (args = args || []).unshift($e);

	      this.$el.trigger.apply(this.$el, args);

	      return $e;
	    },

	    // ### public

	    before: function(type) {
	      var args, $e;

	      args = [].slice.call(arguments, 1);
	      $e = this._trigger('before' + type, args);

	      return $e.isDefaultPrevented();
	    },

	    trigger: function(type) {
	      var deprecatedType;

	      this._trigger(type, [].slice.call(arguments, 1));

	      // TODO: remove in v1
	      if (deprecatedType = deprecationMap[type]) {
	        this._trigger(deprecatedType, [].slice.call(arguments, 1));
	      }
	    }
	  });

	  return EventBus;
	})();
	var EventEmitter = (function() {
	  'use strict';

	  var splitter = /\s+/, nextTick = getNextTick();

	  return {
	    onSync: onSync,
	    onAsync: onAsync,
	    off: off,
	    trigger: trigger
	  };

	  function on(method, types, cb, context) {
	    var type;

	    if (!cb) { return this; }

	    types = types.split(splitter);
	    cb = context ? bindContext(cb, context) : cb;

	    this._callbacks = this._callbacks || {};

	    while (type = types.shift()) {
	      this._callbacks[type] = this._callbacks[type] || { sync: [], async: [] };
	      this._callbacks[type][method].push(cb);
	    }

	    return this;
	  }

	  function onAsync(types, cb, context) {
	    return on.call(this, 'async', types, cb, context);
	  }

	  function onSync(types, cb, context) {
	    return on.call(this, 'sync', types, cb, context);
	  }

	  function off(types) {
	    var type;

	    if (!this._callbacks) { return this; }

	    types = types.split(splitter);

	    while (type = types.shift()) {
	      delete this._callbacks[type];
	    }

	    return this;
	  }

	  function trigger(types) {
	    var type, callbacks, args, syncFlush, asyncFlush;

	    if (!this._callbacks) { return this; }

	    types = types.split(splitter);
	    args = [].slice.call(arguments, 1);

	    while ((type = types.shift()) && (callbacks = this._callbacks[type])) {
	      syncFlush = getFlush(callbacks.sync, this, [type].concat(args));
	      asyncFlush = getFlush(callbacks.async, this, [type].concat(args));

	      syncFlush() && nextTick(asyncFlush);
	    }

	    return this;
	  }

	  function getFlush(callbacks, context, args) {
	    return flush;

	    function flush() {
	      var cancelled;

	      for (var i = 0, len = callbacks.length; !cancelled && i < len; i += 1) {
	        // only cancel if the callback explicitly returns false
	        cancelled = callbacks[i].apply(context, args) === false;
	      }

	      return !cancelled;
	    }
	  }

	  function getNextTick() {
	    var nextTickFn;

	    // IE10+
	    if (window.setImmediate) {
	      nextTickFn = function nextTickSetImmediate(fn) {
	        setImmediate(function() { fn(); });
	      };
	    }

	    // old browsers
	    else {
	      nextTickFn = function nextTickSetTimeout(fn) {
	        setTimeout(function() { fn(); }, 0);
	      };
	    }

	    return nextTickFn;
	  }

	  function bindContext(fn, context) {
	    return fn.bind ?
	      fn.bind(context) :
	      function() { fn.apply(context, [].slice.call(arguments, 0)); };
	  }
	})();
	var highlight = (function(doc) {
	  'use strict';

	  var defaults = {
	        node: null,
	        pattern: null,
	        tagName: 'strong',
	        className: null,
	        wordsOnly: false,
	        caseSensitive: false
	      };

	  return function hightlight(o) {
	    var regex;

	    o = $_.mixin({}, defaults, o);

	    if (!o.node || !o.pattern) {
	      // fail silently
	      return;
	    }

	    // support wrapping multiple patterns
	    o.pattern = $_.isArray(o.pattern) ? o.pattern : [o.pattern];

	    regex = getRegex(o.pattern, o.caseSensitive, o.wordsOnly);
	    traverse(o.node, hightlightTextNode);

	    function hightlightTextNode(textNode) {
	      var match, patternNode, wrapperNode;

	      if (match = regex.exec(textNode.data)) {
	        wrapperNode = doc.createElement(o.tagName);
	        o.className && (wrapperNode.className = o.className);

	        patternNode = textNode.splitText(match.index);
	        patternNode.splitText(match[0].length);
	        wrapperNode.appendChild(patternNode.cloneNode(true));

	        textNode.parentNode.replaceChild(wrapperNode, patternNode);
	      }

	      return !!match;
	    }

	    function traverse(el, hightlightTextNode) {
	      var childNode, TEXT_NODE_TYPE = 3;

	      for (var i = 0; i < el.childNodes.length; i++) {
	        childNode = el.childNodes[i];

	        if (childNode.nodeType === TEXT_NODE_TYPE) {
	          i += hightlightTextNode(childNode) ? 1 : 0;
	        }

	        else {
	          traverse(childNode, hightlightTextNode);
	        }
	      }
	    }
	  };

	  function getRegex(patterns, caseSensitive, wordsOnly) {
	    var escapedPatterns = [], regexStr;

	    for (var i = 0, len = patterns.length; i < len; i++) {
	      escapedPatterns.push($_.escapeRegExChars(patterns[i]));
	    }

	    regexStr = wordsOnly ?
	      '\\b(' + escapedPatterns.join('|') + ')\\b' :
	      '(' + escapedPatterns.join('|') + ')';

	    return caseSensitive ? new RegExp(regexStr) : new RegExp(regexStr, 'i');
	  }
	})(window.document);
	var Input = (function() {
	  'use strict';

	  var specialKeyCodeMap;

	  specialKeyCodeMap = {
	    9: 'tab',
	    27: 'esc',
	    37: 'left',
	    39: 'right',
	    13: 'enter',
	    38: 'up',
	    40: 'down'
	  };

	  // constructor
	  // -----------

	  function Input(o, www) {
	    o = o || {};

	    if (!o.input) {
	      $.error('input is missing');
	    }

	    www.mixin(this);

	    this.$hint = $(o.hint);
	    this.$input = $(o.input);

	    // the query defaults to whatever the value of the input is
	    // on initialization, it'll most likely be an empty string
	    this.query = this.$input.val();

	    // for tracking when a change event should be triggered
	    this.queryWhenFocused = this.hasFocus() ? this.query : null;

	    // helps with calculating the width of the input's value
	    this.$overflowHelper = buildOverflowHelper(this.$input);

	    // detect the initial lang direction
	    this._checkLanguageDirection();

	    // if no hint, noop all the hint related functions
	    if (this.$hint.length === 0) {
	      this.setHint =
	      this.getHint =
	      this.clearHint =
	      this.clearHintIfInvalid = $_.noop;
	    }
	  }

	  // static methods
	  // --------------

	  Input.normalizeQuery = function(str) {
	    // strips leading whitespace and condenses all whitespace
	    return ($_.toStr(str)).replace(/^\s*/g, '').replace(/\s{2,}/g, ' ');
	  };

	  // instance methods
	  // ----------------

	  $_.mixin(Input.prototype, EventEmitter, {

	    // ### event handlers

	    _onBlur: function onBlur() {
	      this.resetInputValue();
	      this.trigger('blurred');
	    },

	    _onFocus: function onFocus() {
	      this.queryWhenFocused = this.query;
	      this.trigger('focused');
	    },

	    _onKeydown: function onKeydown($e) {
	      // which is normalized and consistent (but not for ie)
	      var keyName = specialKeyCodeMap[$e.which || $e.keyCode];

	      this._managePreventDefault(keyName, $e);
	      if (keyName && this._shouldTrigger(keyName, $e)) {
	        this.trigger(keyName + 'Keyed', $e);
	      }
	    },

	    _onInput: function onInput() {
	      this._setQuery(this.getInputValue());
	      this.clearHintIfInvalid();
	      this._checkLanguageDirection();
	    },

	    // ### private

	    _managePreventDefault: function managePreventDefault(keyName, $e) {
	      var preventDefault;

	      switch (keyName) {
	        case 'up':
	        case 'down':
	          preventDefault = !withModifier($e);
	          break;

	        default:
	          preventDefault = false;
	      }

	      preventDefault && $e.preventDefault();
	    },

	    _shouldTrigger: function shouldTrigger(keyName, $e) {
	      var trigger;

	      switch (keyName) {
	        case 'tab':
	          trigger = !withModifier($e);
	          break;

	        default:
	          trigger = true;
	      }

	      return trigger;
	    },

	    _checkLanguageDirection: function checkLanguageDirection() {
	      var dir = (this.$input.css('direction') || 'ltr').toLowerCase();

	      if (this.dir !== dir) {
	        this.dir = dir;
	        this.$hint.attr('dir', dir);
	        this.trigger('langDirChanged', dir);
	      }
	    },

	    _setQuery: function setQuery(val, silent) {
	      var areEquivalent, hasDifferentWhitespace;

	      areEquivalent = areQueriesEquivalent(val, this.query);
	      hasDifferentWhitespace = areEquivalent ?
	        this.query.length !== val.length : false;

	      this.query = val;

	      if (!silent && !areEquivalent) {
	        this.trigger('queryChanged', this.query);
	      }

	      else if (!silent && hasDifferentWhitespace) {
	        this.trigger('whitespaceChanged', this.query);
	      }
	    },

	    // ### public

	    bind: function() {
	      var that = this, onBlur, onFocus, onKeydown, onInput;

	      // bound functions
	      onBlur = $_.bind(this._onBlur, this);
	      onFocus = $_.bind(this._onFocus, this);
	      onKeydown = $_.bind(this._onKeydown, this);
	      onInput = $_.bind(this._onInput, this);

	      this.$input
	      .on('blur.tt', onBlur)
	      .on('focus.tt', onFocus)
	      .on('keydown.tt', onKeydown)
	      .on('input.tt', onInput);

	      return this;
	    },

	    focus: function focus() {
	      this.$input.focus();
	    },

	    blur: function blur() {
	      this.$input.blur();
	    },

	    getLangDir: function getLangDir() {
	      return this.dir;
	    },

	    getQuery: function getQuery() {
	      return this.query || '';
	    },

	    setQuery: function setQuery(val, silent) {
	      this.setInputValue(val);
	      this._setQuery(val, silent);
	    },

	    hasQueryChangedSinceLastFocus: function hasQueryChangedSinceLastFocus() {
	      return this.query !== this.queryWhenFocused;
	    },

	    getInputValue: function getInputValue() {
	      return this.$input.val();
	    },

	    setInputValue: function setInputValue(value) {
	      this.$input.val(value);
	      this.clearHintIfInvalid();
	      this._checkLanguageDirection();
	    },

	    resetInputValue: function resetInputValue() {
	      this.setInputValue(this.query);
	    },

	    getHint: function getHint() {
	      return this.$hint.val();
	    },

	    setHint: function setHint(value) {
	      this.$hint.val(value);
	    },

	    clearHint: function clearHint() {
	      this.setHint('');
	    },

	    clearHintIfInvalid: function clearHintIfInvalid() {
	      var val, hint, valIsPrefixOfHint, isValid;

	      val = this.getInputValue();
	      hint = this.getHint();
	      valIsPrefixOfHint = val !== hint && hint.indexOf(val) === 0;
	      isValid = val !== '' && valIsPrefixOfHint && !this.hasOverflow();

	      !isValid && this.clearHint();
	    },

	    hasFocus: function hasFocus() {
	      return this.$input.is(':focus');
	    },

	    hasOverflow: function hasOverflow() {
	      // 2 is arbitrary, just picking a small number to handle edge cases
	      var constraint = this.$input.width() - 2;

	      this.$overflowHelper.text(this.getInputValue());

	      return this.$overflowHelper.width() >= constraint;
	    },

	    isCursorAtEnd: function() {
	      var valueLength, selectionStart, range;

	      valueLength = this.$input.val().length;
	      selectionStart = this.$input[0].selectionStart;

	      if ($_.isNumber(selectionStart)) {
	       return selectionStart === valueLength;
	      }

	      else if (document.selection) {
	        // NOTE: this won't work unless the input has focus, the good news
	        // is this code should only get called when the input has focus
	        range = document.selection.createRange();
	        range.moveStart('character', -valueLength);

	        return valueLength === range.text.length;
	      }

	      return true;
	    },

	    destroy: function destroy() {
	      this.$hint.off('.tt');
	      this.$input.off('.tt');
	      this.$overflowHelper.remove();

	      // #970
	      this.$hint = this.$input = this.$overflowHelper = $('<div>');
	    }
	  });

	  return Input;

	  // helper functions
	  // ----------------

	  function buildOverflowHelper($input) {
	    return $('<pre aria-hidden="true"></pre>')
	    .css({
	      // position helper off-screen
	      position: 'absolute',
	      visibility: 'hidden',
	      // avoid line breaks and whitespace collapsing
	      whiteSpace: 'pre',
	      // use same font css as input to calculate accurate width
	      fontFamily: $input.css('font-family'),
	      fontSize: $input.css('font-size'),
	      fontStyle: $input.css('font-style'),
	      fontVariant: $input.css('font-variant'),
	      fontWeight: $input.css('font-weight'),
	      wordSpacing: $input.css('word-spacing'),
	      letterSpacing: $input.css('letter-spacing'),
	      textIndent: $input.css('text-indent'),
	      textRendering: $input.css('text-rendering'),
	      textTransform: $input.css('text-transform')
	    })
	    .insertAfter($input);
	  }

	  function areQueriesEquivalent(a, b) {
	    return Input.normalizeQuery(a) === Input.normalizeQuery(b);
	  }

	  function withModifier($e) {
	    return $e.altKey || $e.ctrlKey || $e.metaKey || $e.shiftKey;
	  }
	})();
	var Dataset = (function() {
	  'use strict';

	  var keys, nameGenerator;

	  keys = {
	    val: 'tt-selectable-display',
	    obj: 'tt-selectable-object'
	  };

	  nameGenerator = $_.getIdGenerator();

	  // constructor
	  // -----------

	  function Dataset(o, www) {
	    o = o || {};
	    o.templates = o.templates || {};

	    // DEPRECATED: empty will be dropped in v1
	    o.templates.notFound = o.templates.notFound || o.templates.empty;

	    if (!o.source) {
	      $.error('missing source');
	    }

	    if (!o.node) {
	      $.error('missing node');
	    }

	    if (o.name && !isValidName(o.name)) {
	      $.error('invalid dataset name: ' + o.name);
	    }

	    www.mixin(this);

	    this.highlight = !!o.highlight;
	    this.name = o.name || nameGenerator();

	    this.limit = o.limit || 5;
	    this.displayFn = getDisplayFn(o.display || o.displayKey);
	    this.templates = getTemplates(o.templates, this.displayFn);

	    // use duck typing to see if source is a bloodhound instance by checking
	    // for the __ttAdapter property; otherwise assume it is a function
	    this.source = o.source.__ttAdapter ? o.source.__ttAdapter() : o.source;

	    // if the async option is undefined, inspect the source signature as
	    // a hint to figuring out of the source will return async suggestions
	    this.async = $_.isUndefined(o.async) ? this.source.length > 2 : !!o.async;

	    this._resetLastSuggestion();

	    this.$el = $(o.node)
	    .addClass(this.classes.dataset)
	    .addClass(this.classes.dataset + '-' + this.name);
	  }

	  // static methods
	  // --------------

	  Dataset.extractData = function extractData(el) {
	    var $el = $(el);

	    if ($el.data(keys.obj)) {
	      return {
	        val: $el.data(keys.val) || '',
	        obj: $el.data(keys.obj) || null
	      };
	    }

	    return null;
	  };

	  // instance methods
	  // ----------------

	  $_.mixin(Dataset.prototype, EventEmitter, {

	    // ### private

	    _overwrite: function overwrite(query, suggestions) {
	      suggestions = suggestions || [];

	      // got suggestions: overwrite dom with suggestions
	      if (suggestions.length) {
	        this._renderSuggestions(query, suggestions);
	      }

	      // no suggestions, expecting async: overwrite dom with pending
	      else if (this.async && this.templates.pending) {
	        this._renderPending(query);
	      }

	      // no suggestions, not expecting async: overwrite dom with not found
	      else if (!this.async && this.templates.notFound) {
	        this._renderNotFound(query);
	      }

	      // nothing to render: empty dom
	      else {
	        this._empty();
	      }

	      this.trigger('rendered', this.name, suggestions, false);
	    },

	    _append: function append(query, suggestions) {
	      suggestions = suggestions || [];

	      // got suggestions, sync suggestions exist: append suggestions to dom
	      if (suggestions.length && this.$lastSuggestion.length) {
	        this._appendSuggestions(query, suggestions);
	      }

	      // got suggestions, no sync suggestions: overwrite dom with suggestions
	      else if (suggestions.length) {
	        this._renderSuggestions(query, suggestions);
	      }

	      // no async/sync suggestions: overwrite dom with not found
	      else if (!this.$lastSuggestion.length && this.templates.notFound) {
	        this._renderNotFound(query);
	      }

	      this.trigger('rendered', this.name, suggestions, true);
	    },

	    _renderSuggestions: function renderSuggestions(query, suggestions) {
	      var $fragment;

	      $fragment = this._getSuggestionsFragment(query, suggestions);
	      this.$lastSuggestion = $fragment.children().last();

	      this.$el.html($fragment)
	      .prepend(this._getHeader(query, suggestions))
	      .append(this._getFooter(query, suggestions));
	    },

	    _appendSuggestions: function appendSuggestions(query, suggestions) {
	      var $fragment, $lastSuggestion;

	      $fragment = this._getSuggestionsFragment(query, suggestions);
	      $lastSuggestion = $fragment.children().last();

	      this.$lastSuggestion.after($fragment);

	      this.$lastSuggestion = $lastSuggestion;
	    },

	    _renderPending: function renderPending(query) {
	      var template = this.templates.pending;

	      this._resetLastSuggestion();
	      template && this.$el.html(template({
	        query: query,
	        dataset: this.name,
	      }));
	    },

	    _renderNotFound: function renderNotFound(query) {
	      var template = this.templates.notFound;

	      this._resetLastSuggestion();
	      template && this.$el.html(template({
	        query: query,
	        dataset: this.name,
	      }));
	    },

	    _empty: function empty() {
	      this.$el.empty();
	      this._resetLastSuggestion();
	    },

	    _getSuggestionsFragment: function getSuggestionsFragment(query, suggestions) {
	      var that = this, fragment;

	      fragment = document.createDocumentFragment();
	      $_.each(suggestions, function getSuggestionNode(suggestion) {
	        var $el, context;

	        context = that._injectQuery(query, suggestion);

	        $el = $(that.templates.suggestion(context))
	        .data(keys.obj, suggestion)
	        .data(keys.val, that.displayFn(suggestion))
	        .addClass(that.classes.suggestion + ' ' + that.classes.selectable);

	        fragment.appendChild($el[0]);
	      });

	      this.highlight && highlight({
	        className: this.classes.highlight,
	        node: fragment,
	        pattern: query
	      });

	      return $(fragment);
	    },

	    _getFooter: function getFooter(query, suggestions) {
	      return this.templates.footer ?
	        this.templates.footer({
	          query: query,
	          suggestions: suggestions,
	          dataset: this.name
	        }) : null;
	    },

	    _getHeader: function getHeader(query, suggestions) {
	      return this.templates.header ?
	        this.templates.header({
	          query: query,
	          suggestions: suggestions,
	          dataset: this.name
	        }) : null;
	    },

	    _resetLastSuggestion: function resetLastSuggestion() {
	      this.$lastSuggestion = $();
	    },

	    _injectQuery: function injectQuery(query, obj) {
	      return $_.isObject(obj) ? $_.mixin({ _query: query }, obj) : obj;
	    },

	    // ### public

	    update: function update(query) {
	      var that = this, canceled = false, syncCalled = false, rendered = 0;

	      // cancel possible pending update
	      this.cancel();

	      this.cancel = function cancel() {
	        canceled = true;
	        that.cancel = $.noop;
	        that.async && that.trigger('asyncCanceled', query);
	      };

	      this.source(query, sync, async);
	      !syncCalled && sync([]);

	      function sync(suggestions) {
	        if (syncCalled) { return; }

	        syncCalled = true;
	        suggestions = (suggestions || []).slice(0, that.limit);
	        rendered = suggestions.length;

	        that._overwrite(query, suggestions);

	        if (rendered < that.limit && that.async) {
	          that.trigger('asyncRequested', query);
	        }
	      }

	      function async(suggestions) {
	        suggestions = suggestions || [];

	        // if the update has been canceled or if the query has changed
	        // do not render the suggestions as they've become outdated
	        if (!canceled && rendered < that.limit) {
	          that.cancel = $.noop;
	          rendered += suggestions.length;
	          that._append(query, suggestions.slice(0, that.limit - rendered));

	          that.async && that.trigger('asyncReceived', query);
	        }
	      }
	    },

	    // cancel function gets set in #update
	    cancel: $.noop,

	    clear: function clear() {
	      this._empty();
	      this.cancel();
	      this.trigger('cleared');
	    },

	    isEmpty: function isEmpty() {
	      return this.$el.is(':empty');
	    },

	    destroy: function destroy() {
	      // #970
	      this.$el = $('<div>');
	    }
	  });

	  return Dataset;

	  // helper functions
	  // ----------------

	  function getDisplayFn(display) {
	    display = display || $_.stringify;

	    return $_.isFunction(display) ? display : displayFn;

	    function displayFn(obj) { return obj[display]; }
	  }

	  function getTemplates(templates, displayFn) {
	    return {
	      notFound: templates.notFound && $_.templatify(templates.notFound),
	      pending: templates.pending && $_.templatify(templates.pending),
	      header: templates.header && $_.templatify(templates.header),
	      footer: templates.footer && $_.templatify(templates.footer),
	      suggestion: templates.suggestion || suggestionTemplate
	    };

	    function suggestionTemplate(context) {
	      return $('<div>').text(displayFn(context));
	    }
	  }

	  function isValidName(str) {
	    // dashes, underscores, letters, and numbers
	    return (/^[_a-zA-Z0-9-]+$/).test(str);
	  }
	})();
	var Menu = (function() {
	  'use strict';

	  // constructor
	  // -----------

	  function Menu(o, www) {
	    var that = this;

	    o = o || {};

	    if (!o.node) {
	      $.error('node is required');
	    }

	    www.mixin(this);

	    this.$node = $(o.node);

	    // the latest query #update was called with
	    this.query = null;
	    this.datasets = $_.map(o.datasets, initializeDataset);

	    function initializeDataset(oDataset) {
	      var node = that.$node.find(oDataset.node).first();
	      oDataset.node = node.length ? node : $('<div>').appendTo(that.$node);

	      return new Dataset(oDataset, www);
	    }
	  }

	  // instance methods
	  // ----------------

	  $_.mixin(Menu.prototype, EventEmitter, {

	    // ### event handlers

	    _onSelectableClick: function onSelectableClick($e) {
	      this.trigger('selectableClicked', $($e.currentTarget));
	    },

	    _onRendered: function onRendered(type, dataset, suggestions, async) {
	      this.$node.toggleClass(this.classes.empty, this._allDatasetsEmpty());
	      this.trigger('datasetRendered', dataset, suggestions, async);
	    },

	    _onCleared: function onCleared() {
	      this.$node.toggleClass(this.classes.empty, this._allDatasetsEmpty());
	      this.trigger('datasetCleared');
	    },

	    _propagate: function propagate() {
	      this.trigger.apply(this, arguments);
	    },

	    // ### private

	    _allDatasetsEmpty: function allDatasetsEmpty() {
	      return $_.every(this.datasets, isDatasetEmpty);

	      function isDatasetEmpty(dataset) { return dataset.isEmpty(); }
	    },

	    _getSelectables: function getSelectables() {
	      return this.$node.find(this.selectors.selectable);
	    },

	    _removeCursor: function _removeCursor() {
	      var $selectable = this.getActiveSelectable();
	      $selectable && $selectable.removeClass(this.classes.cursor);
	    },

	    _ensureVisible: function ensureVisible($el) {
	      var elTop, elBottom, nodeScrollTop, nodeHeight;

	      elTop = $el.position().top;
	      elBottom = elTop + $el.outerHeight(true);
	      nodeScrollTop = this.$node.scrollTop();
	      nodeHeight = this.$node.height() +
	        parseInt(this.$node.css('paddingTop'), 10) +
	        parseInt(this.$node.css('paddingBottom'), 10);

	      if (elTop < 0) {
	        this.$node.scrollTop(nodeScrollTop + elTop);
	      }

	      else if (nodeHeight < elBottom) {
	        this.$node.scrollTop(nodeScrollTop + (elBottom - nodeHeight));
	      }
	    },

	    // ### public

	    bind: function() {
	    var that = this, onSelectableClick;

	      onSelectableClick = $_.bind(this._onSelectableClick, this);
	      this.$node.on('click.tt', this.selectors.selectable, onSelectableClick);

	      $_.each(this.datasets, function(dataset) {
	        dataset
	        .onSync('asyncRequested', that._propagate, that)
	        .onSync('asyncCanceled', that._propagate, that)
	        .onSync('asyncReceived', that._propagate, that)
	        .onSync('rendered', that._onRendered, that)
	        .onSync('cleared', that._onCleared, that);
	      });

	      return this;
	    },

	    isOpen: function isOpen() {
	      return this.$node.hasClass(this.classes.open);
	    },

	    open: function open() {
	      this.$node.addClass(this.classes.open);
	    },

	    close: function close() {
	      this.$node.removeClass(this.classes.open);
	      this._removeCursor();
	    },

	    setLanguageDirection: function setLanguageDirection(dir) {
	      this.$node.attr('dir', dir);
	    },

	    selectableRelativeToCursor: function selectableRelativeToCursor(delta) {
	      var $selectables, $oldCursor, oldIndex, newIndex;

	      $oldCursor = this.getActiveSelectable();
	      $selectables = this._getSelectables();

	      // shifting before and after modulo to deal with -1 index
	      oldIndex = $oldCursor ? $selectables.index($oldCursor) : -1;
	      newIndex = oldIndex + delta;
	      newIndex = (newIndex + 1) % ($selectables.length + 1) - 1;

	      // wrap new index if less than -1
	      newIndex = newIndex < -1 ? $selectables.length - 1 : newIndex;

	      return newIndex === -1 ? null : $selectables.eq(newIndex);
	    },

	    setCursor: function setCursor($selectable) {
	      this._removeCursor();

	      if ($selectable = $selectable && $selectable.first()) {
	        $selectable.addClass(this.classes.cursor);

	        // in the case of scrollable overflow
	        // make sure the cursor is visible in the node
	        this._ensureVisible($selectable);
	      }
	    },

	    getSelectableData: function getSelectableData($el) {
	      return ($el && $el.length) ? Dataset.extractData($el) : null;
	    },

	    getActiveSelectable: function getActiveSelectable() {
	      var $selectable = this._getSelectables().filter(this.selectors.cursor).first();

	      return $selectable.length ? $selectable : null;
	    },

	    getTopSelectable: function getTopSelectable() {
	      var $selectable = this._getSelectables().first();

	      return $selectable.length ? $selectable : null;
	    },

	    update: function update(query) {
	      var isValidUpdate = query !== this.query;

	      // don't update if the query hasn't changed
	      if (isValidUpdate) {
	        this.query = query;
	        $_.each(this.datasets, updateDataset);
	      }

	      return isValidUpdate;

	      function updateDataset(dataset) { dataset.update(query); }
	    },

	    empty: function empty() {
	      $_.each(this.datasets, clearDataset);

	      this.query = null;
	      this.$node.addClass(this.classes.empty);

	      function clearDataset(dataset) { dataset.clear(); }
	    },

	    destroy: function destroy() {
	      this.$node.off('.tt');

	      // #970
	      this.$node = $('<div>');

	      $_.each(this.datasets, destroyDataset);

	      function destroyDataset(dataset) { dataset.destroy(); }
	    }
	  });

	  return Menu;
	})();
	var DefaultMenu = (function() {
	  'use strict';

	  var s = Menu.prototype;

	  function DefaultMenu() {
	    Menu.apply(this, [].slice.call(arguments, 0));
	  }

	  $_.mixin(DefaultMenu.prototype, Menu.prototype, {
	    // overrides
	    // ---------

	    open: function open() {
	      // only display the menu when there's something to be shown
	      !this._allDatasetsEmpty() && this._show();
	      return s.open.apply(this, [].slice.call(arguments, 0));
	    },

	    close: function close() {
	      this._hide();
	      return s.close.apply(this, [].slice.call(arguments, 0));
	    },

	    _onRendered: function onRendered() {
	      if (this._allDatasetsEmpty()) {
	        this._hide();
	      }

	      else {
	        this.isOpen() && this._show();
	      }

	      return s._onRendered.apply(this, [].slice.call(arguments, 0));
	    },

	    _onCleared: function onCleared() {
	      if (this._allDatasetsEmpty()) {
	        this._hide();
	      }

	      else {
	        this.isOpen() && this._show();
	      }

	      return s._onCleared.apply(this, [].slice.call(arguments, 0));
	    },

	    setLanguageDirection: function setLanguageDirection(dir) {
	      this.$node.css(dir === 'ltr' ? this.css.ltr : this.css.rtl);
	      return s.setLanguageDirection.apply(this, [].slice.call(arguments, 0));
	    },

	    // private
	    // ---------

	    _hide: function hide() {
	      this.$node.hide();
	    },

	    _show: function show() {
	      // can't use jQuery#show because $node is a span element we want
	      // display: block; not dislay: inline;
	      this.$node.css('display', 'block');
	    }
	  });

	  return DefaultMenu;
	})();
	var Typeahead = (function() {
	  'use strict';

	  // constructor
	  // -----------

	  function Typeahead(o, www) {
	    var onFocused, onBlurred, onEnterKeyed, onTabKeyed, onEscKeyed, onUpKeyed,
	        onDownKeyed, onLeftKeyed, onRightKeyed, onQueryChanged,
	        onWhitespaceChanged;

	    o = o || {};

	    if (!o.input) {
	      $.error('missing input');
	    }

	    if (!o.menu) {
	      $.error('missing menu');
	    }

	    if (!o.eventBus) {
	      $.error('missing event bus');
	    }

	    www.mixin(this);

	    this.eventBus = o.eventBus;
	    this.minLength = $_.isNumber(o.minLength) ? o.minLength : 1;

	    this.input = o.input;
	    this.menu = o.menu;

	    this.enabled = true;

	    // activate the typeahead on init if the input has focus
	    this.active = false;
	    this.input.hasFocus() && this.activate();

	    // detect the initial lang direction
	    this.dir = this.input.getLangDir();

	    this._hacks();

	    this.menu.bind()
	    .onSync('selectableClicked', this._onSelectableClicked, this)
	    .onSync('asyncRequested', this._onAsyncRequested, this)
	    .onSync('asyncCanceled', this._onAsyncCanceled, this)
	    .onSync('asyncReceived', this._onAsyncReceived, this)
	    .onSync('datasetRendered', this._onDatasetRendered, this)
	    .onSync('datasetCleared', this._onDatasetCleared, this);

	    // composed event handlers for input
	    onFocused = c(this, 'activate', 'open', '_onFocused');
	    onBlurred = c(this, 'deactivate', '_onBlurred');
	    onEnterKeyed = c(this, 'isActive', 'isOpen', '_onEnterKeyed');
	    onTabKeyed = c(this, 'isActive', 'isOpen', '_onTabKeyed');
	    onEscKeyed = c(this, 'isActive', '_onEscKeyed');
	    onUpKeyed = c(this, 'isActive', 'open', '_onUpKeyed');
	    onDownKeyed = c(this, 'isActive', 'open', '_onDownKeyed');
	    onLeftKeyed = c(this, 'isActive', 'isOpen', '_onLeftKeyed');
	    onRightKeyed = c(this, 'isActive', 'isOpen', '_onRightKeyed');
	    onQueryChanged = c(this, '_openIfActive', '_onQueryChanged');
	    onWhitespaceChanged = c(this, '_openIfActive', '_onWhitespaceChanged');

	    this.input.bind()
	    .onSync('focused', onFocused, this)
	    .onSync('blurred', onBlurred, this)
	    .onSync('enterKeyed', onEnterKeyed, this)
	    .onSync('tabKeyed', onTabKeyed, this)
	    .onSync('escKeyed', onEscKeyed, this)
	    .onSync('upKeyed', onUpKeyed, this)
	    .onSync('downKeyed', onDownKeyed, this)
	    .onSync('leftKeyed', onLeftKeyed, this)
	    .onSync('rightKeyed', onRightKeyed, this)
	    .onSync('queryChanged', onQueryChanged, this)
	    .onSync('whitespaceChanged', onWhitespaceChanged, this)
	    .onSync('langDirChanged', this._onLangDirChanged, this);
	  }

	  // instance methods
	  // ----------------

	  $_.mixin(Typeahead.prototype, {

	    // here's where hacks get applied and we don't feel bad about it
	    _hacks: function hacks() {
	      var $input, $menu;

	      // these default values are to make testing easier
	      $input = this.input.$input || $('<div>');
	      $menu = this.menu.$node || $('<div>');

	      // #705: if there's scrollable overflow, ie doesn't support
	      // blur cancellations when the scrollbar is clicked
	      //
	      // #351: preventDefault won't cancel blurs in ie <= 8
	      $input.on('blur.tt', function($e) {
	        var active, isActive, hasActive;

	        active = document.activeElement;
	        isActive = $menu.is(active);
	        hasActive = $menu.has(active).length > 0;
	      });

	      // #351: prevents input blur due to clicks within menu
	      $menu.on('mousedown.tt', function($e) { $e.preventDefault(); });
	    },

	    // ### event handlers

	    _onSelectableClicked: function onSelectableClicked(type, $el) {
	      this.select($el);
	    },

	    _onDatasetCleared: function onDatasetCleared() {
	      this._updateHint();
	    },

	    _onDatasetRendered: function onDatasetRendered(type, dataset, suggestions, async) {
	      this._updateHint();
	      this.eventBus.trigger('render', suggestions, async, dataset);
	    },

	    _onAsyncRequested: function onAsyncRequested(type, dataset, query) {
	      this.eventBus.trigger('asyncrequest', query, dataset);
	    },

	    _onAsyncCanceled: function onAsyncCanceled(type, dataset, query) {
	      this.eventBus.trigger('asynccancel', query, dataset);
	    },

	    _onAsyncReceived: function onAsyncReceived(type, dataset, query) {
	      this.eventBus.trigger('asyncreceive', query, dataset);
	    },

	    _onFocused: function onFocused() {
	      this._minLengthMet() && this.menu.update(this.input.getQuery());
	    },

	    _onBlurred: function onBlurred() {
	      if (this.input.hasQueryChangedSinceLastFocus()) {
	        this.eventBus.trigger('change', this.input.getQuery());
	      }
	    },

	    _onEnterKeyed: function onEnterKeyed(type, $e) {
	      var $selectable;

	      if ($selectable = this.menu.getActiveSelectable()) {
	        this.select($selectable) && $e.preventDefault();
	      }
	    },

	    _onTabKeyed: function onTabKeyed(type, $e) {
	      var $selectable;

	      if ($selectable = this.menu.getActiveSelectable()) {
	        this.select($selectable) && $e.preventDefault();
	      }

	      else if ($selectable = this.menu.getTopSelectable()) {
	        this.autocomplete($selectable) && $e.preventDefault();
	      }
	    },

	    _onEscKeyed: function onEscKeyed() {
	      this.close();
	    },

	    _onUpKeyed: function onUpKeyed() {
	      this.moveCursor(-1);
	    },

	    _onDownKeyed: function onDownKeyed() {
	      this.moveCursor(+1);
	    },

	    _onLeftKeyed: function onLeftKeyed() {
	      if (this.dir === 'rtl' && this.input.isCursorAtEnd()) {
	        this.autocomplete(this.menu.getTopSelectable());
	      }
	    },

	    _onRightKeyed: function onRightKeyed() {
	      if (this.dir === 'ltr' && this.input.isCursorAtEnd()) {
	        this.autocomplete(this.menu.getTopSelectable());
	      }
	    },

	    _onQueryChanged: function onQueryChanged(e, query) {
	      this._minLengthMet(query) ? this.menu.update(query) : this.menu.empty();
	    },

	    _onWhitespaceChanged: function onWhitespaceChanged() {
	      this._updateHint();
	    },

	    _onLangDirChanged: function onLangDirChanged(e, dir) {
	      if (this.dir !== dir) {
	        this.dir = dir;
	        this.menu.setLanguageDirection(dir);
	      }
	    },

	    // ### private

	    _openIfActive: function openIfActive() {
	      this.isActive() && this.open();
	    },

	    _minLengthMet: function minLengthMet(query) {
	      query = _.isString(query) ? query : (this.input.getQuery() || '');

	      return query.length >= this.minLength;
	    },

	    _updateHint: function updateHint() {
	      var $selectable, data, val, query, escapedQuery, frontMatchRegEx, match;

	      $selectable = this.menu.getTopSelectable();
	      data = this.menu.getSelectableData($selectable);
	      val = this.input.getInputValue();

	      if (data && !_.isBlankString(val) && !this.input.hasOverflow()) {
	        query = Input.normalizeQuery(val);
	        escapedQuery = _.escapeRegExChars(query);

	        // match input value, then capture trailing text
	        frontMatchRegEx = new RegExp('^(?:' + escapedQuery + ')(.+$)', 'i');
	        match = frontMatchRegEx.exec(data.val);

	        // clear hint if there's no trailing text
	        match && this.input.setHint(val + match[1]);
	      }

	      else {
	        this.input.clearHint();
	      }
	    },

	    // ### public

	    isEnabled: function isEnabled() {
	      return this.enabled;
	    },

	    enable: function enable() {
	      this.enabled = true;
	    },

	    disable: function disable() {
	      this.enabled = false;
	    },

	    isActive: function isActive() {
	      return this.active;
	    },

	    activate: function activate() {
	      // already active
	      if (this.isActive()) {
	        return true;
	      }

	      // unable to activate either due to the typeahead being disabled
	      // or due to the active event being prevented
	      else if (!this.isEnabled() || this.eventBus.before('active')) {
	        return false;
	      }

	      // activate
	      else {
	        this.active = true;
	        this.eventBus.trigger('active');
	        return true;
	      }
	    },

	    deactivate: function deactivate() {
	      // already idle
	      if (!this.isActive()) {
	        return true;
	      }

	      // unable to deactivate due to the idle event being prevented
	      else if (this.eventBus.before('idle')) {
	        return false;
	      }

	      // deactivate
	      else {
	        this.active = false;
	        this.close();
	        this.eventBus.trigger('idle');
	        return true;
	      }
	    },

	    isOpen: function isOpen() {
	      return this.menu.isOpen();
	    },

	    open: function open() {
	      if (!this.isOpen() && !this.eventBus.before('open')) {
	        this.menu.open();
	        this._updateHint();
	        this.eventBus.trigger('open');
	      }

	      return this.isOpen();
	    },

	    close: function close() {
	      if (this.isOpen() && !this.eventBus.before('close')) {
	        this.menu.close();
	        this.input.clearHint();
	        this.input.resetInputValue();
	        this.eventBus.trigger('close');
	      }
	      return !this.isOpen();
	    },

	    setVal: function setVal(val) {
	      // expect val to be a string, so be safe, and coerce
	      this.input.setQuery(_.toStr(val));
	    },

	    getVal: function getVal() {
	      return this.input.getQuery();
	    },

	    select: function select($selectable) {
	      var data = this.menu.getSelectableData($selectable);

	      if (data && !this.eventBus.before('select', data.obj)) {
	        this.input.setQuery(data.val, true);

	        this.eventBus.trigger('select', data.obj);
	        this.close();

	        // return true if selection succeeded
	        return true;
	      }

	      return false;
	    },

	    autocomplete: function autocomplete($selectable) {
	      var query, data, isValid;

	      query = this.input.getQuery();
	      data = this.menu.getSelectableData($selectable);
	      isValid = data && query !== data.val;

	      if (isValid && !this.eventBus.before('autocomplete', data.obj)) {
	        this.input.setQuery(data.val);
	        this.eventBus.trigger('autocomplete', data.obj);

	        // return true if autocompletion succeeded
	        return true;
	      }

	      return false;
	    },

	    moveCursor: function moveCursor(delta) {
	      var query, $candidate, data, payload, cancelMove;

	      query = this.input.getQuery();
	      $candidate = this.menu.selectableRelativeToCursor(delta);
	      data = this.menu.getSelectableData($candidate);
	      payload = data ? data.obj : null;

	      // update will return true when it's a new query and new suggestions
	      // need to be fetched – in this case we don't want to move the cursor
	      cancelMove = this._minLengthMet() && this.menu.update(query);

	      if (!cancelMove && !this.eventBus.before('cursorchange', payload)) {
	        this.menu.setCursor($candidate);

	        // cursor moved to different selectable
	        if (data) {
	          this.input.setInputValue(data.val);
	        }

	        // cursor moved off of selectables, back to input
	        else {
	          this.input.resetInputValue();
	          this._updateHint();
	        }

	        this.eventBus.trigger('cursorchange', payload);

	        // return true if move succeeded
	        return true;
	      }

	      return false;
	    },

	    destroy: function destroy() {
	      this.input.destroy();
	      this.menu.destroy();
	    }
	  });

	  return Typeahead;

	  // helper functions
	  // ----------------

	  function c(ctx) {
	    var methods = [].slice.call(arguments, 1);

	    return function() {
	      var args = [].slice.call(arguments);

	      $_.each(methods, function(method) {
	        return ctx[method].apply(ctx, args);
	      });
	    };
	  }
	})();
	(function() {
	  'use strict';

	  var old, keys, methods;

	  old = $.fn.typeahead;

	  keys = {
	    www: 'tt-www',
	    attrs: 'tt-attrs',
	    typeahead: 'tt-typeahead'
	  };

	  methods = {
	    // supported signatures:
	    // function(o, dataset, dataset, ...)
	    // function(o, [dataset, dataset, ...])
	    initialize: function initialize(o, datasets) {
	      var www;

	      datasets = $_.isArray(datasets) ? datasets : [].slice.call(arguments, 1);

	      o = o || {};
	      www = WWW(o.classNames);

	      return this.each(attach);

	      function attach() {
	        var $input, $wrapper, $hint, $menu, defaultHint, defaultMenu,
	            eventBus, input, menu, typeahead, MenuConstructor;

	        // highlight is a top-level config that needs to get inherited
	        // from all of the datasets
	        $_.each(datasets, function(d) { d.highlight = !!o.highlight; });

	        $input = $(this);
	        $wrapper = $(www.html.wrapper);
	        $hint = $elOrNull(o.hint);
	        $menu = $elOrNull(o.menu);

	        defaultHint = o.hint !== false && !$hint;
	        defaultMenu = o.menu !== false && !$menu;

	        defaultHint && ($hint = buildHintFromInput($input, www));
	        defaultMenu && ($menu = $(www.html.menu).css(www.css.menu));

	        // hint should be empty on init
	        $hint && $hint.val('');
	        $input = prepInput($input, www);

	        // only apply inline styles and make dom changes if necessary
	        if (defaultHint || defaultMenu) {
	          $wrapper.css(www.css.wrapper);
	          $input.css(defaultHint ? www.css.input : www.css.inputWithNoHint);

	          $input
	          .wrap($wrapper)
	          .parent()
	          .prepend(defaultHint ? $hint : null)
	          .append(defaultMenu ? $menu : null);
	        }

	        MenuConstructor = defaultMenu ? DefaultMenu : Menu;

	        eventBus = new EventBus({ el: $input });
	        input = new Input({ hint: $hint, input: $input, }, www);
	        menu = new MenuConstructor({
	          node: $menu,
	          datasets: datasets
	        }, www);

	        typeahead = new Typeahead({
	          input: input,
	          menu: menu,
	          eventBus: eventBus,
	          minLength: o.minLength
	        }, www);

	        $input.data(keys.www, www);
	        $input.data(keys.typeahead, typeahead);
	      }
	    },

	    isEnabled: function isEnabled() {
	      var enabled;

	      ttEach(this.first(), function(t) { enabled = t.isEnabled(); });
	      return enabled;
	    },

	    enable: function enable() {
	      ttEach(this, function(t) { t.enable(); });
	      return this;
	    },

	    disable: function disable() {
	      ttEach(this, function(t) { t.disable(); });
	      return this;
	    },

	    isActive: function isActive() {
	      var active;

	      ttEach(this.first(), function(t) { active = t.isActive(); });
	      return active;
	    },

	    activate: function activate() {
	      ttEach(this, function(t) { t.activate(); });
	      return this;
	    },

	    deactivate: function deactivate() {
	      ttEach(this, function(t) { t.deactivate(); });
	      return this;
	    },

	    isOpen: function isOpen() {
	      var open;

	      ttEach(this.first(), function(t) { open = t.isOpen(); });
	      return open;
	    },

	    open: function open() {
	      ttEach(this, function(t) { t.open(); });
	      return this;
	    },

	    close: function close() {
	      ttEach(this, function(t) { t.close(); });
	      return this;
	    },

	    select: function select(el) {
	      var success = false, $el = $(el);

	      ttEach(this.first(), function(t) { success = t.select($el); });
	      return success;
	    },

	    autocomplete: function autocomplete(el) {
	      var success = false, $el = $(el);

	      ttEach(this.first(), function(t) { success = t.autocomplete($el); });
	      return success;
	    },

	    moveCursor: function moveCursoe(delta) {
	      var success = false;

	      ttEach(this.first(), function(t) { success = t.moveCursor(delta); });
	      return success;
	    },

	    // mirror jQuery#val functionality: reads opearte on first match,
	    // write operates on all matches
	    val: function val(newVal) {
	      var query;

	      if (!arguments.length) {
	        ttEach(this.first(), function(t) { query = t.getVal(); });
	        return query;
	      }

	      else {
	        ttEach(this, function(t) { t.setVal(newVal); });
	        return this;
	      }
	    },

	    destroy: function destroy() {
	      ttEach(this, function(typeahead, $input) {
	        revert($input);
	        typeahead.destroy();
	      });

	      return this;
	    }
	  };

	  $.fn.typeahead = function(method) {
	    // methods that should only act on intialized typeaheads
	    if (methods[method]) {
	      return methods[method].apply(this, [].slice.call(arguments, 1));
	    }

	    else {
	      return methods.initialize.apply(this, arguments);
	    }
	  };

	  $.fn.typeahead.noConflict = function noConflict() {
	    $.fn.typeahead = old;
	    return this;
	  };

	  // helper methods
	  // --------------

	  function ttEach($els, fn) {
	    $els.each(function() {
	      var $input = $(this), typeahead;

	      (typeahead = $input.data(keys.typeahead)) && fn(typeahead, $input);
	    });
	  }

	  function buildHintFromInput($input, www) {
	    return $input.clone()
	    .addClass(www.classes.hint)
	    .removeData()
	    .css(www.css.hint)
	    .css(getBackgroundStyles($input))
	    .prop('readonly', true)
	    .removeAttr('id name placeholder required')
	    .attr({ autocomplete: 'off', spellcheck: 'false', tabindex: -1 });
	  }

	  function prepInput($input, www) {
	    // store the original values of the attrs that get modified
	    // so modifications can be reverted on destroy
	    $input.data(keys.attrs, {
	      dir: $input.attr('dir'),
	      autocomplete: $input.attr('autocomplete'),
	      spellcheck: $input.attr('spellcheck'),
	      style: $input.attr('style')
	    });

	    $input
	    .addClass(www.classes.input)
	    .attr({ autocomplete: 'off', spellcheck: false });

	    // ie7 does not like it when dir is set to auto
	    try { !$input.attr('dir') && $input.attr('dir', 'auto'); } catch (e) {}

	    return $input;
	  }

	  function getBackgroundStyles($el) {
	    return {
	      backgroundAttachment: $el.css('background-attachment'),
	      backgroundClip: $el.css('background-clip'),
	      backgroundColor: $el.css('background-color'),
	      backgroundImage: $el.css('background-image'),
	      backgroundOrigin: $el.css('background-origin'),
	      backgroundPosition: $el.css('background-position'),
	      backgroundRepeat: $el.css('background-repeat'),
	      backgroundSize: $el.css('background-size')
	    };
	  }

	  function revert($input) {
	    var www, $wrapper;

	    www = $input.data(keys.www);
	    $wrapper = $input.parent().filter(www.selectors.wrapper);

	    // need to remove attrs that weren't previously defined and
	    // revert attrs that originally had a value
	    $_.each($input.data(keys.attrs), function(val, key) {
	      $_.isUndefined(val) ? $input.removeAttr(key) : $input.attr(key, val);
	    });

	    $input
	    .removeData(keys.typeahead)
	    .removeData(keys.www)
	    .removeData(keys.attr)
	    .removeClass(www.classes.input);

	    if ($wrapper.length) {
	      $input.detach().insertAfter($wrapper);
	      $wrapper.remove();
	    }
	  }

	  function $elOrNull(obj) {
	    var isValid, $el;

	    isValid = $_.isJQuery(obj) || $_.isElement(obj);
	    $el = isValid ? $(obj).first() : [];

	    return $el.length ? $el : null;
	  }
	})();

});

