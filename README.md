**outback** is a JavaScript library that extends [Backbone.js](http://documentcloud.github.com/backbone/) with support for [Knockout](http://knockoutjs.com)-inspired declarative bindings. 

## tl;dr

Setup up your Backbone.View like so:

```CoffeeScript

class TodoView extends Backbone.View
	model: TodoModel

	@render: ->
		Backbone.outback.bind @

	@remove: ->
		Backbone.outback.unbind @

```

Sprinkle data-bind attributes into your templates:

```HTML

<div id="edit">
	<input type="text" class="todo-input" data-bind="value: @todo">
</div>

```

## Can I configure the bindings in code instead?

Yes, outback bindings can be setup in either code or markup.

```CoffeeScript

class TodoView extends Backbone.View
	model: TodoModel

	dataBindings:
		'#edit .todo-input': 
			value: Backbone.outback.modelRef 'todo'

	@render: ->
		Backbone.outback.bind @

	@remove: ->
		Backbone.outback.unbind @

```

## Does this work with regular JavaScript?

Yes.

## Which bindings are currently supported?

[visible][v], [text][t], [html][h], [css][css], ~~style~~, [attr][attr], ~~click~~, ~~event~~, ~~submit~~, [enable][en], [disable][de], [value][value]

[v]: http://knockoutjs.com/documentation/visible-binding.html
[t]: http://knockoutjs.com/documentation/text-binding.html
[h]: http://knockoutjs.com/documentation/html-binding.html
[css]: http://knockoutjs.com/documentation/css-binding.html
[attr]: http://knockoutjs.com/documentation/attr-binding.html
[en]: http://knockoutjs.com/documentation/enable-binding.html
[de]: http://knockoutjs.com/documentation/disable-binding.html
[value]: http://knockoutjs.com/documentation/value-binding.html

## Can I add my own custom bindings?

Yes.

```CoffeeScript

Backbone.outback.bindingHandlers['custom'] = ->

	# init is called when the view is rendered
	init: (element, valueAccessor, allBindingsAccessor) ->
		# element is a jQuery selection
		$el = element 				
		
		# register for DOM updates
		$el.on 'change', (e) ->
			value = valueAccessor()		
			value $el.val()

	# update is called when the model changes
	update: (element, valueAccessor, allBindingsAccessor) ->
		$el = element 				

		value = valueAccessor()		
		$el.val value()

	# remove is called when the view is unbound (removed)
	remove: (element, valueAccessor, allBindingsAccessor) ->
		$el = element
		$el.off 'change'

```

## That looks almost exactly like how Knockout does it.

Thanks.

## Can I include arbitrary JavaScript expressions in my data-binds?

No. 

1. `data-bind` attributes are handled by [rj](https://github.com/politician/relaxed-json-parser) which recognizes a small superset of JSON.  Specifically, the `@name` notation is parsed using the rules for JavaScript identifiers.
2. Personally, I don't think it's a good idea to put logic in markup.

## XSS

The `text`, `value`, and `attr` bindings use `model.escape` instead of `model.get` to help defend against XSS attacks.  This feature may be turned off by including `escape: false` in the binding configuration.  The `html` binding uses jQuery's natural mechanism and is not overridable.

```HTML
<!-- prevent outback from mangling the url -->
<a data-bind="attr: { href: @url }, escape: false"></a>
```

## What's on your todo list?

1. Add support for the majority of Knockout.js bindings
2. The ability to use the view instead of the model when binding
3. Cascading dropdowns, and other dependency management problems

License
---

    The MIT License

    Copyright (c) 2012 David Zarlengo 

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.