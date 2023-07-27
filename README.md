# typeahead.js 2013


Inspired by [twitter.com]'s autocomplete search functionality, typeahead.js is 
a flexible JavaScript library that provides a strong foundation for building 
robust typeaheads.

The typeahead.js library consists of 3 components:
* Bloodhound - a mini client-side database for search results
* Typeahead - the UI for the suggestion engine
* Twitter jQuery Extensions, `$_` - a small library shared across the other 2 components

The suggestion engine is responsible for computing suggestions for a given 
query. The UI view is responsible for rendering suggestions and handling DOM 
interactions. Both components can be used separately, but when used together, 
they can provide a rich typeahead experience.

Examples
--------

2013 Examples: http://twitter.github.io/typeahead.js/examples


# 2023 Brass9 Update

Twitter's Typeahead still works great, but if you try to use it with modern jQuery3, it's going to at least warn you in the migrate library, if not outright break due to the removal of deprecated features like `.isFunction`.

It could use an upgrade, and jQuery3 also has underlying principles a decade later worth bringing to typeahead - for example, that oldIE is dead and not worth the extra code to support.

This fork upgrades the Typeahead to use jquery3.7.x. It also gets rid of oldIE-specific code, and, it removes an odd redundancy in the original dist files - a jQuery extension library named "_" (but, was not the popular Underscore library) that appeared in both bloodhound and typeahead. In this version it's extracted. That means you need 3 dist files (in this order) for a working Typeahead:

	typeahead-jquery-ext.js
	bloodhound.js
	typeahead.jquery.js

Or just use the full bundle:

	typeahead.bundle.js

Also note that typeahead.jquery.js is misleading; it might make it seem like it's the only part that depends on jQuery. In fact all 3 files do (and always did). So, jquery-3.7.0.js (or higher) should be loaded before these Typeahead files.



## Getting Started

The 2023 update requires jquery3.7.x+.

The simplest Typeahead requires data, sent as a JSON packet in a flat array format, of strings. For example:

	[
		"Ford",
		"Ford F150",
		"Ford Flustyflam"
	]

For small-ish datasets (10000 records or less), simple datasets like this can be loaded locally. You could place the JSON at the end of the page, or post-load it, like:

HTML:

	<input type=text id=searchArray />
	<script src=jquery-3.7.0.js></script>
	<script src=typeahead-underscore.js></script>
	<script src=bloodhound.js></script>
	<script src=typeahead.jquery.js></script>

Javascript:

	$.ajax('/test/typeaheadarray')
		.done(r => {
			let bloodhound = new Bloodhound({
				queryTokenizer: Bloodhound.tokenizers.whitespace,
				local: r,
				datumTokenizer: Bloodhound.tokenizers.whitespace
			});

			$('#searchArray').typeahead({
				// Config section 1
			},
			{
				// Config section 2
				source: bloodhound,
			});
		});

Here jQuery is loading the flat array of strings - our data source - via `$.ajax()`. The promise resolves and calls `.done(...` and our flat array arrives as `r`.

We create a Bloodhound instance, which makes a very simple local database inside the browser. The Bloodhound instance is then passed to the Typeahead, so that fast, indexed search of our flat data can happen as the user types.

We get the input tag we're using as our search textbox with jQuery like `$('#searchArray')` then call the Typeahead plugin. The first options object is for passing Typeahead options - ones that affect how it looks. The second is for your data and how to query it.

That's it! You've got a working typeahead! You might want to nice it up slightly with some basic options:

	... .typeahead({
		highlight: true
	})

That will help stress what in the results matches what the user has typed so far.

# Documentation 

# 2013 Documentation

Bloodhound: https://github.com/twitter/typeahead.js/blob/master/doc/bloodhound.md
Typeahead: https://github.com/twitter/typeahead.js/blob/master/doc/jquery_typeahead.md

# 2023 Documentation

First let's cover the basic Getting Started Example we just used. The above code does a lot to your HTML in the DOM. It actually duplicates the input tag so it can provide a cleaner typeahead appearance, which if you wrote out in HTML would look like this:

	<input class=tt-hint readonly autocomplete=off spellcheck=false tabindex=-1 >
	<input id=searchArray class=tt-input autocomplete=off spellcheck=false >

So you can see your original input box is still on the page, but it comes second after a copy that's used to render the typeahead portion of results. The user largely can't interact with the copy, which is why it's marked with tabindex=-1 (which removes it from the tab key flow through the page). Autocomplete and Spellcheck get turned off for you, which would interfere with the typeahead - no need for you to specify it yourself.

As you type, results appear. The results are inserted into the DOM in the same container as your original input, just below it. If you had typed them out in HTML, they look like this:

	<div class=tt-menu >
		<div class="tt-dataset tt-dataset-0">
			<div class="tt-suggestion tt-selectable tt-cursor">
				<strong class=tt-highlight >F</strong>ord
			</div>
			<div class="tt-suggestion tt-selectable">
				<strong class=tt-highlight >F</strong>ord F150
			</div>
			. . .
		</div>
	</div>

You're probably going to want to style all of this, so here's an explanation of what these classes are trying to help you do:

`tt-menu` Marks the dropdown box itself

`tt-dataset` Marks a dataset. You might also notice `tt-dataset-0` - this is because the Typeahead has support for multiple datasets, which must be something Twitter needs behind the scenes. It's a layer of complexity I've never explored, so if you want multiple datasets, you'll need to refer to the very limited, [2013 Documentation] about it. But for most uses, this div wrapper is irrelevant - it's just an extra container.

`tt-suggestion` Marks an item in the dropdown

`tt-cursor` Marks the highlighted item - when the user taps the up/down keys on their keyboard, they can move up and down the results list, and tt-cursor follows that selection around.

`strong.tt-highlight` Marks the highlighted portion of the text in a result. Note that there's no tag wrapping the remainder of the result, and, that after a few characters it's easy to get yourself into a situation where the leading character is not what's highlighted. For example someone searching for "or" in this test dataset is going to get (shorthand) `F<>or</>d` So, if you want to style characters that are not in the result, you'll need to consider how your highlight style sits on top of the non-highlighted style.

## Basic Style Options

hint, highlight, minlength, classNames. See [2013 Documentation].

## Advanced Style Options

The second config section offers templates, which will change the HTML the Typeahead inserts into the DOM for different parts of itself.

For a full list see [2013 Documentation].

### Templates

`suggestion`

Example usage:

	{
		source: ...,
		templates: {
			suggestion: r => `<span>${r}</span>`
		}
	}

This templates section goes in the second config section.

The value to pass varies based on the kind of data you're using. For flat data, use a function like the above. The only argument passed (`r` here) is a string - the full text of the search result being rendered. In our template, we're adding an extra span wrapper around it, perhaps to add some extra CSS effects.

If you're using more complex JSON, there's still only one argument passed to you, but its contents, and your responsibilities, differ. The resulting object will look like this, for a dataset with JSON rows that each look like { id, name }:

	{
		_query: 'Text typed so far in typeahead',
		id: 1,
		name: 'Ford'
	}

That is, the object passed to you is the row of your data being rendered in the results, plus a mixin property of `_query`, which gives you the text typed so far in the input box. You're going to need it, because using complex JSON instead of a flat array moves the burden of highlighting in this template on to you:

	templates: {
		suggestion: r => {
			let s = r.name.replace(r._query, '<strong>$&</strong>');
			return `<div>${s}</div>`;
		}
	}

(This example uses several newer features of Javascript that long-time coders may not be as familiar with. The arrow `=>` syntax is shorthand for a function. The `$&` in the replace string inserts the replaced term, useful for compiled-speed wrapping. And the backticks and `${...}` provide compiled-speed Javascript String Templates or String Interpolation.)

This is a pretty major departure from the templates that worked on flat data. You might have expected a single template to work for both styles of data, but unfortunately that's not the case. Not only is what we're passed different, but if `highlight: true` is set, highlighting now becomes the developer's responsibility. You can see a quick way to accomplish that in the `.replace()` call above.

Regardless of your data type, the output from this template may surprise you. It won't render with just the tags you asked for - the Typeahead is going to insert its classes into what you emit. The above template won't just get you a div tag wrapped around a strong tag, it's going to give you this:

	<div class="tt-suggestion tt-selectable">
		<strong class=tt-highlight >F</strong>ord F150
	</div>

The Typeahead is going to insert its classes back into the tags you give it, to the best of its ability. So if you have existing styles on these you were trying to get away from, by overriding the HTML like this, unfortunately this won't do the trick for you.

## Data Source

The `source` argument allows suggestion engines other than Bloodhound, or, wrappers around Bloodhound to vary what is provided when. The source argument takes a function, not an object:

	source: function(query, syncCallback, asyncCallback)


## Bloodhound

You are most likely going to use the default, Bloodhound, to provide the Typeahead's data source.

### A Note on .ttAdapter()

In some examples of the Typeahead (and some older versions of it), Bloodhound instances are referenced like:

	source: bloodhound.ttAdapter()

You no longer need to do this - you can just pass the Bloodhound instance:

	source: bloodhound

That's because both sides are playing sneaky games. Bloodhound aliases its internal function (exposed as public because Javascript) `.__ttAdapter()` as `.ttAdapter()`. And then the Typeahead has a class called `Dataset` that accepts your source property, and when it initializes it checks for a method named, `__ttAdapter()`.

So, when a Bloodhound instance is passed as a source, even though the Typeahead is supposed to take a function with 3 arguments, this sneaky arrangement occurs and the instance works without explicitly calling it yourself. You could write your own class as data source, and provide a sneaky `.__ttAdapter()`, and it would work passed as-is as an object to the source property as well.

### Typeahead-Bloodhound Overall Flow

As the user types, typeahead.jquery.js consumes the key strokes and throws them to a throttle function. That limits how many overall events it will respond. As the throttle function allows, the next stage of the Typeahead code hands the typed keys off to the data source, which is usually Bloodhound.

(Bloodhound can be pre-filled with a prefetch - see below.)

Bloodhound consumes the keys typed so far - the query - and applies the queryTokenizer to it. By default this just breaks up what's been typed by the space character (or other whitespace). It then fires what is usually a remote query against the server endpoint, but, it could be a local query instead.

See below for details on this query, but the basic configuration fires just one query for all results. Using a wildcard, replace or prepare option (see below) increases this - by default to one remote query per throttled keystroke.

### Basics

You'll generally use a simple Bloodhound source like:

	source: new Bloodhound({
		remote: '/typeaheadjson',
		queryTokenizer: Bloodhound.tokenizers.whitespace,
		datumTokenizer: Bloodhound.tokenizers.whitespace
	})

If the data source is returning a simple array of strings, that's all you need, but if it's
returning complex JSON you have to at least tell it where to find the name and id of each data item:

	source: new Bloodhound({
		remote: '/typeaheadjson',
		queryTokenizer: Bloodhound.tokenizers.whitespace,
		identify: d => d.id,
		datumTokenizer: d => Bloodhound.tokenizers.whitespace(d.name)
	})

Here you can see the datumTokenizer is now a function that passes a property that represents the plaintext result the user will see (`.name` in our case), and identify points to a unique Id for each data result (`.id` in our case).

#### .id property

Note that the ID for identify is required, but, may not be what you expect. It has to be unique to the client-side, but, it doesn't need to be anything else. For example, suppose you had rows in a table on the server you were packing and sending to the client-side. The obvious thing to do is send each row to the client, with the unique server-side ID from the database - and that will work great.

But, suppose you instead have a projection of the database, with multiple plaintext suggestions for a single database row, to help users find results. Now your database IDs, if you used them as-is, are going to repeat, and that's going to cause a weird problem. In short, this projection would have a lot of data missing in the typeahead. Your suggestions will get internalized by Bloodhound with the assumption each ID is unique *to the client-side*. It doesn't care about the server-side at all, but it is going to naively use those IDs to index and store your data - one entry per ID.

In such a projection scenario, you have to ensure you provide IDs that are unique to the client-side, but, they have no other requirements. Just an arbitrary counter that ticks up row by row as the projected data heads out to the client is fine.

### Remote

You can break out the remote into a full options object, accomplishing the exact same thing:

	source: new Bloodhound({
		remote: {
			url: '/typeaheadjson'
		},
		queryTokenizer: Bloodhound.tokenizers.whitespace,
		datumTokenizer: Bloodhound.tokenizers.whitespace
	})

You can also provide 2 URLs, one for a prefetch to speed up first results, and one for broader search:

	source: new Bloodhound({
		prefetch:	'/typeaheadprefetchjson',
		remote: '/typeaheadjson',
		...
	})

If you have limited control over your remote, or, multiple typeaheads using the same data you want to be cached, or an API you don't want to change to suit the Typeahead, you can sacrifice some performance by applying transforms to the incoming data (you can apply same to prefetch):

	remote: {
		url: '...',
		prepare: function(),
		transform: function(),
	}

By default, prefetch and remote are ruthlessly simple. prefetch gets called exactly once, with a fast, ideally cached baseline of data (if you're personalizing search results in any way, you might want to forego that for the prefetch to avoid the slowdown of a database hit). remote gets called ...exactly once as well, unless you provide more options. So all-in this is going to be 2 queries, and, the remote call had better return everything the user might ever want to know. Depending on the size of your results, you may need to evaluate browser LocalStorage limits and how large your dataset is, taking into account other LocalStorage usage on your page as well.

#### Remote queries

You can get the remote to pass an actual query that the user typed like so:

	source: new Bloodhound({
		remote: {
			url: '/typeaheadjson?q=query',
			wildcard: 'query'
		}
	}

Each time Bloodhound hits its local Db and turns up too few results, it's going to pass the query to the server-side, performing a dead-simple Regex replace on your url string - in this case replacing the phrase "query" with what the user typed. So if the user typed "Fo", the server is going to get hit with a GET at /typeaheadjson?q=fo

Behind the scenes, this is building a prepare function for you. You can get more advanced (if you need to) by passing a replace function of your own in like:

	remote: {
		url: '/typeaheadjson?q=query',
		replace: (url, q) => url.replace(/query/, q)

In this case we're just doing a simple regex replace, but, you could do much more complex URL transforms here if you wanted to - for example you could react to the contents of the query and send a reformatted alternative to one of many endpoints (although if you are going to go this far, you are probably overengineering it and should leverage the multiple Datasets instead).

Finally if you need to override things per-request you can outright write your own prepare function:

	remote: {
		url: '/typeaheadjson?q=query',
		prepare: (o, q) => {
			o.url = url.replace(/query/, q);
			return o;
		}

The entire remote options object is passed in, in the first argument, and anything you return in the resulting options object will be reflected in this remote call.

#### Example for use of replace/prepare

The queries to the server are already throttled by default - once per 300ms - and cached. But, you can further decrease hits to the server and increase cacheability by trimming queries at exponential intervals like so:

	replace: (url, q) => {
		const len = q.length;
		const powerof2 = [0, 2, 4, 8, 16, 32].reduce((prev, curr) => len >= curr ? curr : prev);
		q = q.substr(0, powerof2);
		return url.replace('query', q);
	}

If someone types 0 or 1 characters, this trims the result to nothing, so ?q= (no query passed) is sent to the server - a very cacheable URL. If they type 2-3 characters, the first 2 will be passed. So typing 'for' is going to trigger 2 queries, both for ?q=fo - and because of caching, only the first will be sent. And so forth, at intervals 4, 8, 16 and 32. If that makes sense you can stop reading now. If you'd like to better understand this example and how Bloodhound reacts, read on.

Bloodhound never reduces its LocalStorage usage as long as the page remains open, so you could use this strategy to provide results that have not already been sent (and nothing else). For example, if you send enough top results for 0 and 1 characters when 0 characters is sent above, the most efficient thing to return for ?q=fo is the top results for those 2 characters, plus every possible third character, *except* the results sent for 0-1. Sending those again is easier to write on the server, and easier to think about, but it's going to be a waste to the client, since Bloodhound is going to just see they're already in the index and discard them (leaving what it already has in-place).

Likewise, an optimal response for 4 characters should provide the top results for those 4, plus every possible 5, 6, and 7 char combo - except the results already sent for the first 2, and, 0 chars.



<!-- section links -->

[2013 Documentation]: https://github.com/twitter/typeahead.js/blob/master/doc/jquery_typeahead.md


Browser Support
---------------

* Chrome
* Firefox 3.5+
* Safari 4+
* WebKit-based Edge
* Does not support Internet Explorer


Dev Support
----------------

For technical questions, you should post a question on [Stack Overflow] and tag 
it with [typeahead.js][so tag].

<!-- section links -->

[Stack Overflow]: http://stackoverflow.com/
[so tag]: http://stackoverflow.com/questions/tagged/typeahead.js

Twitter has not touched this in a decade and may no longer exist, but you could also visit https://twitter.com/typeahead

License
-------

Copyright 2013 Twitter, Inc.

Licensed under the MIT License
