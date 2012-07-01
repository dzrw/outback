# outback.js

**outback** is a JavaScript library that extends [Backbone.js](http://documentcloud.github.com/backbone/) with support for [Knockout](http://knockoutjs.com)-inspired declarative bindings. 

### Dependencies

* jQuery (>=1.7)
* [Backbone.js](http://documentcloud.github.com/backbone/) (>=0.9.1)
* [Underscore.js](http://documentcloud.github.com/underscore/) (>=1.3.1)
* [rj](https://github.com/politician/relaxed-json-parser)

## Setup

Just add these dependencies to your site's `<head>`, **in order**:

```

<script src="jquery.js"></script>
<script src="underscore.js"></script>
<script src="backbone.js"></script>
<script src="rj.js"></script>
<script src="outback.js"></script>

```

## Usage

Let's start with a complete example (given in [CoffeeScript](http://coffeescript.org/)):

```HTML

<body id="fixture">
   <button id="show" data-bind="disable: @shouldShowMessage">Reveal Text</button>
   <button id="reset" data-bind="enable: @shouldShowMessage">Reset</button>
   <div data-bind="visible: @shouldShowMessage">
      <p>You will see this message only when "shouldShowMessage" holds a true value.</p>
   </div>
</body>

```

```CoffeeScript

class MainView extends Backbone.View
	events:
		'click #show': 'showMessage'
		'click #reset': 'hideMessage'

	initialize: ->
	   @render()

	render: ->
		Backbone.outback.bind @

	remove: ->
		Backbone.outback.unbind @

	showMessage: function() {
		@model.set shouldShowMessage: true

	hideMessage: function() {
		@model.set shouldShowMessage: false

$ ->
	window.app = new MainView
   		el: '#fixture'
	    model: new Backbone.Model 
	    	shouldShowMessage: false

```

Here's a more detailed rundown.

### Step 1: Configure bindings

Configure your markup and templates with 'data-bind' attributes to bind elements to Backbone.Model attributes:

```HTML

<body id="fixture">
   <button id="show" data-bind="disable: @shouldShowMessage">Reveal Text</button>
   <button id="reset" data-bind="enable: @shouldShowMessage">Reset</button>
   <div data-bind="visible: @shouldShowMessage">
      <p>You will see this message only when "shouldShowMessage" holds a true value.</p>
   </div>
</body>

```

The directionality of the binding is handled in the binding API. For example, **text** is a one-way binding useful for spans and paragraphs, and **value** is a two-way binding that is useful for form inputs, selects, and textareas.

### Step 2: Kickstart outback in `render`

In the `render` method of your Backbone.View, call `bind` after appending your markup to `$el`:

```CoffeeScript

render: ->
	Backbone.outback.bind @

```

### Step 3: Clean up your toys in `remove`

Under the hood, outback attaches `change` event handlers to your model.  In order to avoid leaks and zombie function callbacks, you'll need to `unbind` the view in `remove`:

```CoffeeScript

remove: ->
	Backbone.outback.unbind @

```

That's it!

## Does this work with regular JavaScript?

Yes.

## Can I configure the bindings in code instead?

Yes, bindings can be setup in either code or markup; feel free to mix and match.

```CoffeeScript

class TodoView extends Backbone.View
	model: TodoModel

	# modelBindings (viewModelBindings) are bound to your model (viewModel)
	modelBindings:
		'#edit .todo-input': 
			value: Backbone.outback.modelRef 'todo'

	@render: ->
		Backbone.outback.bind @

	@remove: ->
		Backbone.outback.unbind @

```

Use the `''` selector to target `$el`.

## How do I implement dependent controls or computed functions?

There is no specific support for computed functions in outback because Backbone.js handles this case well enough on its own:

```HTML
	<p data-bind="text: @fullname"></p>
```

```CoffeeScript

class MyModel extends Backbone.Model
	initialize: ->
		@on 'change:firstName change:lastName', @fullname, @

	fullname: ->
		fname = @get 'firstName'
		lname = @get 'lastName'
		@set fullname: "#{fname} #{lname}"

```

See examples/example2.html for a working example of this use case.

## How do I specify the options of a select control?

Use the `options` binding as follows:

```HTML
	<script type="text/ignore" id="hotel-options">
		<option value="5">5 star</option>
		<option value="4">4 star</option>
		<option value="3">3 star</option>
	</script>

	<!-- ... later ... -->

	<div id="fixture">
		<select data-bind="options: @hotelOptions"></select>
	</div>
```

```CoffeeScript

	view = new SomeView
		el: $('#fixture')
		model = new Backbone.Model
			hotelOptions: '#hotel-options'

```

## Which bindings are currently supported?

### KnockoutJS bindings

The following bindings were ported from KnockoutJS.

[visible][v], [text][t], [html][h], [css][css], ~~style~~, [attr][attr], ~~click~~, ~~event~~, ~~submit~~, [enable][en], [disable][de], [value][value], [hasfocus][hf], [checked][ck]

[v]: http://knockoutjs.com/documentation/visible-binding.html
[t]: http://knockoutjs.com/documentation/text-binding.html
[h]: http://knockoutjs.com/documentation/html-binding.html
[css]: http://knockoutjs.com/documentation/css-binding.html
[attr]: http://knockoutjs.com/documentation/attr-binding.html
[en]: http://knockoutjs.com/documentation/enable-binding.html
[de]: http://knockoutjs.com/documentation/disable-binding.html
[value]: http://knockoutjs.com/documentation/value-binding.html
[hf]: http://knockoutjs.com/documentation/hasfocus-binding.html
[ck]: http://knockoutjs.com/documentation/checked-binding.html

### Additional bindings

	* _invisible_ is the opposite of the _visible_ binding
	* _currency_ and _date_ are specialized implementations of _text_ for formatted currencies and dates.
	* _options_

## Can I add my own custom bindings?

Yes, the binding handler API is 100% compatible with KnockoutJS.  You should be able to reuse your existing binding handlers by simply adding them to the `bindingHandlers` object.

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

## Can I include arbitrary JavaScript expressions in my data-binds?

No, and in this respect we break compatiblility with KnockoutJS.

1. Personally, I don't think it's a good idea to put that kind of logic in markup.
2. Technically, `data-bind` attributes are handled by [rj](https://github.com/politician/relaxed-json-parser) which recognizes a small superset of JSON.  Specifically, the `@name` notation is parsed using the rules for JavaScript identifiers.

## TodosMVC?

[Yes](https://github.com/politician/outback/tree/master/examples/todos)

## XSS?

The `text`, `value`, and `attr` bindings use `model.escape` instead of `model.get` to help defend against XSS attacks.  This feature may be turned off by including `escape: false` in the binding configuration.  The `html` binding uses jQuery's natural mechanism and is not overridable.

```HTML
<!-- prevent outback from mangling the url -->
<a data-bind="attr: { href: @url, hrefOptions: { escape: false } }"></a>
```

## A little more documentation would be helpful...

Working on it, but for now refer to the [examples][exmpl], [specs][specs], and [source][src].

[exmpl]: https://github.com/politician/outback/tree/master/examples
[specs]: https://github.com/politician/outback/tree/master/spec
[src]: https://github.com/politician/outback/blob/master/outback.js

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