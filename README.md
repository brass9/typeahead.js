typeahead.js 2013
============================

Inspired by [twitter.com]'s autocomplete search functionality, typeahead.js is 
a flexible JavaScript library that provides a strong foundation for building 
robust typeaheads.

The typeahead.js library consists of 2 components: the suggestion engine, 
Bloodhound, and the UI view, Typeahead. 
The suggestion engine is responsible for computing suggestions for a given 
query. The UI view is responsible for rendering suggestions and handling DOM 
interactions. Both components can be used separately, but when used together, 
they can provide a rich typeahead experience.

2023 Brass9 Update
==================

Twitter's Typeahead still works great, but if you try to use it with modern jQuery3, it's going to break - and jQuery migrate is full of warnings.

It could use an upgrade, and jQuery3 also has underlying principles a decade later worth bringing to typeahead - for example, that oldIE is dead and not worth the extra code to support.

This release upgrades the Typeahead to use jquery3.7.x. It also gets rid of oldIE-specific code, and, it removes an odd redundancy in the original dist files - an underscore library that was really a jQuery extension, not the popular Underscore library, appeared in both bloodhound in typeahead. In this version it's extracted.* That means you need 3 dist files for a working Typeahead:

	typeahead-underscore.js
	bloodhound.js
	typeahead.jquery.js

Also note that typeahead.jquery.js is misleading; it might make it seem like it's the only part that depends on jQuery. In fact all 3 files do (and Bloodhound always did). So, jquery-3.7.0.js (or higher) should be loaded before these 3 files.

*The shared $_ library may ultimately be eliminated entirely by leveraging the past decade of Javascript language improvements.

Getting Started
---------------

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
				source: bloodhound.ttAdapter(),
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

Documentation 
-------------

## 2013 Documentation

Bloodhound: https://github.com/twitter/typeahead.js/blob/master/doc/bloodhound.md
Typeahead: https://github.com/twitter/typeahead.js/blob/master/doc/jquery_typeahead.md

## 2023 Documentation

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

`strong.tt-highlight` Marks the highlighted portion of the text in a result. Note that there's no tag wrapping the remainder of the result, and, that after a few characters it's easy to get yourself into a situation where the leading character is not what's highlighted. For example someone searching for "or" in this test dataset is going to get (shorthand) `F<>or</>d` So, if you want to style characters that are not in the result, you'll likely need to consider how your highlight style sits on top of the non-highlighted style.

### Basic Style Options

hint, highlight, minlength, classNames. See [2013 Documentation].

### Advanced Style Options

The second config section offers templates, which will change the HTML the Typeahead inserts into the DOM for different parts of itself.

For a full list see [2013 Documentation].

#### Templates

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

<!-- section links -->

[2013 Documentation]: https://github.com/twitter/typeahead.js/blob/master/doc/jquery_typeahead.md

Examples
--------

2013 Examples: http://twitter.github.io/typeahead.js/examples


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

Twitter has not touched this in a decade and now news article about them tend to include the word "implosion" but you could also visit https://twitter.com/typeahead

License
-------

Copyright 2013 Twitter, Inc.

Licensed under the MIT License
