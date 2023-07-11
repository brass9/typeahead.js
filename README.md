typeahead.js 2013
============================

Inspired by [twitter.com]'s autocomplete search functionality, typeahead.js is 
a flexible JavaScript library that provides a strong foundation for building 
robust typeaheads.

The typeahead.js library consists of 2 components: the suggestion engine, 
[Bloodhound], and the UI view, [Typeahead]. 
The suggestion engine is responsible for computing suggestions for a given 
query. The UI view is responsible for rendering suggestions and handling DOM 
interactions. Both components can be used separately, but when used together, 
they can provide a rich typeahead experience.

2023 Brass9 Update
==================

Twitter's Typeahead still works great, but if you try to use it with modern jQuery3, it's going to break - and jQuery migrate is full of warnings.

It could use an upgrade, and jQuery3 also has underlying principles a decade later worth bringing to typeahead - for example, that oldIE is dead and not worth the extra code to support.


## 2013 Documentation

Bloodhound: https://github.com/twitter/typeahead.js/blob/master/doc/bloodhound.md
Typeahead: https://github.com/twitter/typeahead.js/blob/master/doc/jquery_typeahead.md


Getting Started
---------------


Documentation 
-------------


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

Issues
------

Discovered a bug? Please create an issue here on GitHub!

https://github.com/twitter/typeahead.js/issues


License
-------

Copyright 2013 Twitter, Inc.

Licensed under the MIT License
