/* outback.js v0.1.0 - a data binding library for backbone
   (c) David Zarlengo -- http://github.com/politician/outback
   License: MIT (http://www.opensource.org/licenses/mit-license.php)
*/

(function(root, factory) {
// AMD anonymous module enclosure.  Registers into the Backbone namespace
// as Backbone.outback.
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['jquery', 'underscore', 'backbone', 'rj'], factory);
	} else {
		factory(root.jQuery, root._, root.Backbone, root.rj);
	}
}(this, function($, _, Backbone, rj) {

	var stringTrimRegex = /^(\s|\u00A0)+|(\s|\u00A0)+$/g;    

	function stringTrim (string) {
		return (string || "").replace(stringTrimRegex, "");
	};

	function arrayConcat (first, second) {
		Array.prototype.push.apply(first, second);
		return first;
	}

	function hop(context, p) {
		return Object.prototype.hasOwnProperty.call(context, p);
	}

	function eachfn (list) {
		_.each(list, function(fn, i) { fn(); });
	}

	function makeValueAccessorBuilder(model) {
		return function(binding) {
			var defaultOptions, modelAttrName;

			defaultOptions = {
				escape: false
			};

			modelAttrName = binding.modelAttrName;

			var valueAccessor = function() {
				var args, options, readMethod;

				_.extend(options = {}, defaultOptions);

				args = Array.prototype.slice.call(arguments);
				if (args.length === 1) {
					_.extend(options, args[0]);
				}

				if (!!options.parents) {
					return binding.parents;
				}

				readMethod = options.escape ? 'escape' : 'get';

				var value = function() {
					var args, modelAttr;
					args = Array.prototype.slice.call(arguments);
					if (args.length === 0) {
						modelAttr = model[readMethod](modelAttrName);
						return modelAttr;
					} else {
						modelAttr = args[0];
						model.set(modelAttrName, modelAttr);
					}
				};

				return value;
			};

			return valueAccessor;
		};
	}

	function makeBindingDecl (model, modelAttrName) {
		var subscribe, unsubscribe, valueAccessor;

		subscribe = function(eventName, callback) {
			var eventName;
			eventName = eventName || "change:" + modelAttrName;
			model.on(eventName, callback);
		};

		unsubscribe = function(eventName) {
			var eventName;
			eventName = eventName || "change:" + modelAttrName;
			model.off(eventName);
		};

		return { 
			modelAttrName: modelAttrName,
			valueAccessor: makeValueAccessorBuilder(model),
			modelEvents: {
				eventName: false,		// TODO: Defaults to "change:modelAttrName"
				subscribe: subscribe,
				unsubscribe: unsubscribe
			}
		};		
	}

	function makeBindingDeclReviver (model) {
		return function(k, value) {
			var interesting, modelAttrName;

			interesting = hop(value, '__symbol_literal');
			modelAttrName = value && value['__symbol_literal'];

			if (interesting && hop(model.attributes, modelAttrName)) {
				return makeBindingDecl(model, modelAttrName);
			} else if (interesting) {
				return undefined;
			} else {
				return value;
			}
		};    
	}

	function makeUnobtrusiveBindingDeclReviver (model) {
		return function(k, value) {
			var interesting, modelAttrName;

			interesting = value instanceof OutbackModelRef;
			modelAttrName = value && value.modelAttrName;

			if (interesting && hop(model.attributes, modelAttrName)) {
				return makeBindingDecl(model, modelAttrName);
			} else {
				return value;
			}
		};    
	}

	function parseDataBindAttrBindingDecls (databindAttr, view, model) {
		var bindingDecls, selector;

		bindingDecls = [];
		selector = "*["+databindAttr+"]";

		view.$(selector).each(function () { 
			var element, bindingExpr, directives;

			element = view.$(this);
			bindingExpr = element.attr(databindAttr);
			directives = rj.parse(bindingExpr, makeBindingDeclReviver(model));

			bindingDecls.push({
				element: element,
				directives: directives,
				dataSource: model
			});
		});

		return bindingDecls;
	}

	function parseUnobtrusiveBindingDecls (viewAttr, view, model) {
		var bindingDecls, root;

		bindingDecls = [];

		_.each(view[viewAttr], function(value, selector) {
			if(!hop(view[viewAttr], selector)) return;

			var element, directives;
			element = view.$(selector);

			if(element.size() !== 0) {
				directives = rj.revive(value, makeUnobtrusiveBindingDeclReviver(model));

				bindingDecls.push({
					element: element,
					directives: directives,
					dataSource: model
				});
			}
		});

		return bindingDecls;
	}

	function findExecutableBindings (binding, key) {
		if (hop(binding, 'valueAccessor')) {
			binding.parents = binding.parents || [];
			binding.parents.push(key);
			return [binding];
		} else {
			var pile;
			pile = [];
			_.each(binding, function(item, key) {
				if (!hop(binding, key)) return;
				arrayConcat(pile, findExecutableBindings(item, key));
			});
			return pile;
		}
	}

	function filterExecutableBindings (bindingDecl, bindingHandlers) {
		var allBindings, bindingHandlers, allBindingsAccessor

		allBindings = {};
		executableBindings = [];

		allBindingsAccessor = function() { 
			var args, modelAttr;
			args = Array.prototype.slice.call(arguments);
			if (args.length === 0) {
				return allBindings;
			} else if (hop(allBindings, args[0])) {
				return allBindings[args[0]];
			} else {
				return undefined;
			}
		};

		allBindingsAccessor.testString = function(key, defaultValue) {
			var value = allBindingsAccessor(key);
			return _.isUndefined(value) ? defaultValue : ''+value;
		}

		allBindingsAccessor.testBoolean = function(key, defaultValue) {
			var value = allBindingsAccessor(key);
			return _.isUndefined(value) ? !!defaultValue : !!value;
		};
		
		_.each(bindingDecl.directives, function(binding, key) {
			var pile, executableBinding;

			if (hop(bindingHandlers, key)) {
				pile = findExecutableBindings(binding, key);
				_.each(pile, function(item) {

					_.extend(executableBinding = {}, item, {
						element: bindingDecl.element,
						handler: bindingHandlers[key],
						allBindingsAccessor: allBindingsAccessor
					});

					executableBinding.valueAccessor = executableBinding.valueAccessor(executableBinding);

					executableBindings.push(executableBinding);
				});
			} else {
				delete binding.valueAccessor;
			}

			allBindings[key] = binding;        
		});

		return executableBindings;
	}

	function applyBinding (view, binding) {
		var binders, binderArgs, eventName, updateFn;

		binders = {
			modelSubs: [],
			inits: [],
			updates: [],
			removes: [],
			modelUnsubs: []
		};

		eventName = binding.modelEvents.eventName;
		binderArgs = [binding.element, binding.valueAccessor, binding.allBindingsAccessor, view];

		if (!hop(binding.handler, 'update')) {
			return undefined;
		}

		updateFn = binding.handler.update;

		binders.updates.push(function() { 
			updateFn.apply(view, binderArgs); 
		});

		binders.modelSubs.push(function() {
			binding.modelEvents.subscribe(eventName, function(m, val) {
				updateFn.apply(view, binderArgs);	
			});
		});

		binders.modelUnsubs.push(function () {
			binding.modelEvents.unsubscribe(eventName);
		})

		if (hop(binding.handler, 'init')) {
			binders.inits.push(function() {
				binding.handler.init.apply(view, binderArgs); 
			});
		}

		if (hop(binding.handler, 'remove')) {
			binders.removes.push(function() { 
				binding.handler.remove.apply(view, binderArgs); 
			});
		}

		return binders;	
	}

	var OutbackModelRef = function (modelAttrName) {
		this.modelAttrName = modelAttrName;
	};

	var OutbackBinder = function (view, bindingHandlers) {
		var bindingContexts, allBinders;

		allBinders = {
			modelSubs: [],
			inits: [],
			updates: [],
			removes: [],
			modelUnsubs: []
		};
		
		bindingContexts = {
			model: {
				dataSource: view.model,
				databindAttr: 'data-bind',
				unobtrusiveAttr: 'modelBindings'
			},
			viewModel: {
				dataSource: view.viewModel,
				databindAttr: 'data-bind-view',
				unobtrusiveAttr: 'viewModelBindings'
			}
		};

		function arrayConcatBindingContext(bindingDecls, context) {
			if(context.dataSource) {
				arrayConcat(bindingDecls, parseDataBindAttrBindingDecls(context.databindAttr, view, context.dataSource));
				arrayConcat(bindingDecls, parseUnobtrusiveBindingDecls(context.unobtrusiveAttr, view, context.dataSource));
			}
		}

		this.bind = function () {
			var bindingDecls, bindings, summary;

			summary = {
				executableBindingsSkipped: 0,
				executableBindingsInstalled: 0
			};

			bindingDecls = [];
			arrayConcatBindingContext(bindingDecls, bindingContexts.model);
			arrayConcatBindingContext(bindingDecls, bindingContexts.viewModel);

			bindings = [];
			_.each(bindingDecls, function (bindingDecl) {
				arrayConcat(bindings, filterExecutableBindings(bindingDecl, bindingHandlers));
			});

			if (typeof view.previewBinding === 'function') {
				bindings = _.filter(bindings, function(binding) {
					return view.previewBinding(binding);
				});
			}

			_.each(bindings, function (binding) {
				binders = applyBinding(view, binding);
				if (_.isUndefined(binders)) {
					summary.executableBindingsSkipped++;
					return;
				}

				arrayConcat(allBinders.modelSubs, binders.modelSubs);
				arrayConcat(allBinders.inits, binders.inits);
				arrayConcat(allBinders.updates, binders.updates);
				arrayConcat(allBinders.removes, binders.removes);
				arrayConcat(allBinders.modelUnsubs, binders.modelUnsubs);

				summary.executableBindingsInstalled++;
			});

			// Run binders in stages because we want to avoid cascades.

			eachfn(allBinders.inits);
			eachfn(allBinders.updates);
			eachfn(allBinders.modelSubs);

			if (typeof view.bindingSummary === 'function') {
				view.bindingSummary(summary);
			}
		},

		this.unbind = function () {
			eachfn(allBinders.modelUnsubs);
			eachfn(allBinders.removes);
		}
	};	
	
	// PUBLIC API FOR BACKBONE VIEWS
	// @render: -> Backbone.outback.bind @
	// @remove: -> Backbone.outback.unbind @
	Backbone.outback = {
		version: "0.1.0",
		bind: function(view){
			view.__outback_binder = new OutbackBinder(view, Backbone.outback.bindingHandlers);
			view.__outback_binder.bind();
		},

		unbind: function(view){
			if (view.__outback_binder){
				view.__outback_binder.unbind()
			}
		},

		modelRef: function(modelAttrName) {
			return new OutbackModelRef(modelAttrName);
		},

		bindingHandlers: {}		
	};

	// ===================================
	// STANDARD BINDING HANDLERS
	// ===================================

	// Controlling Text and Appearance
	//

	/*  The "visible" binding

		Usage:
		data-bind="visible: @modelAttr, visibleOptions: { not: <truthy> }"

			@modelAttr is interpreted as truthy or falsy

			not is used to flip the visibility test performed
			by this binding. The default is false.
		
		Purpose: The visible binding causes the associated DOM element to 
		become hidden or visible according to the value you pass to the 
		binding.
	*/
	Backbone.outback.bindingHandlers['visible'] = (function() {
		function optionsFor(allBindingsAccessor) {
			var config, options;

			config = {
				not: false
			};
					
			options = allBindingsAccessor('visibleOptions');
			if (options && hop(options, 'not')) {
				config.not = !!options.not;
			}
			
			return config;
		}

		return {
			update: function (element, valueAccessor, allBindingsAccessor, view) {
				var config, value, names, index;
				config = optionsFor(allBindingsAccessor);
				
				var names = ['show', 'hide'];
				if (config.not) names.reverse();
				var index = !!valueAccessor()() ? 0 : 1;

				$(element)[names[index]]();
			}
		}
	})();

	/*	The "text" binding

		Usage:
		data-bind="text: @modelAttr, textOptions: { escape: <truthy> }"

			escape controls whether or not an HTML-escaped version of a model's
			attribute is used.  Using escape to retrieve attributes will 
			prevent XSS attacks.  The default is true.

		Purpose: The text binding causes the associated DOM element to display
		the text value of your parameter.
	*/
	Backbone.outback.bindingHandlers['text'] = (function() {
		function optionsFor(valueAccessor, allBindingsAccessor) {
			var config, options;

			config = {
				escape: true
			};
					
			options = allBindingsAccessor('textOptions');
			if (options && hop(options, 'escape')) {
				config.escape = !!options.escape;
			}
			
			return config;
		}

		return {
			update: function (element, valueAccessor, allBindingsAccessor, view) {
				var config, text;
				config = optionsFor(valueAccessor, allBindingsAccessor);

				text = valueAccessor({escape: config.escape})();
				$(element).text(text);
			}
		}
	})();

	/*	The "html" binding

		Usage:
		data-bind="html: @modelAttr"

		Purpose: The html binding causes the associated DOM element to display
		the HTML specified by your parameter.

		Remarks: The escape option is not honored by this binding because
		jQuery provides its own XSS protection. 
	*/
	Backbone.outback.bindingHandlers['html'] = (function() {
		return {
			update: function (element, valueAccessor, allBindingsAccessor, view) {
				var value;
				value = valueAccessor()();
				$(element).html(value);
			}
		}
	})();

	/*	The "css" binding

		Usage:
		data-bind="css: { class1: @modelAttr1, class2: @modelAttr2, class2Options: { not: <truthy> } }"

			@modelAttr is interpreted as truthy or falsy

		Purpose: The css binding adds or removes one or more named CSS classes
		to the associated DOM element.
	*/
	Backbone.outback.bindingHandlers['css'] = (function() {
		function optionsFor(valueAccessor, allBindingsAccessor) {
			var config, parents, binding, options, classOptions;

			config = {
				not: false
			};

			parents = valueAccessor({parents: true});
			if (parents.length !== 1) {
				return undefined;
			}

			config.className = parents[0];

			binding = allBindingsAccessor('css');
			if (hop(binding, config.className + 'Options')) {
				options = binding[config.className + 'Options'];
				if(options && hop(options, 'not')) {
					config.not = !!options.not;
				}
			}
			
			return config;
		}

		return {
			update: function (element, valueAccessor, allBindingsAccessor, view) {
				var config;

				config = optionsFor(valueAccessor, allBindingsAccessor);
				if(_.isUndefined(config)) return;

				var names = ['addClass', 'removeClass'];
				if (config.not) names.reverse();
				var index = !!valueAccessor()() ? 0 : 1;

				$(element)[names[index]](config.className);
			}
		}
	})();

	/*	The "attr" binding

		Usage:
		data-bind="attr: { attr1: @modelAttr1, attr2: @modelAttr2, attr2Options: { escape: <truthy> } }"

			@modelAttr is interpreted as attribute values
			
			escape controls whether or not an HTML-escaped version of a model's
			attribute is used.  Using escape to retrieve attributes will 
			prevent XSS attacks.  The default is true.

		Purpose: The attr binding provides a generic way to set the value of
		any attribute for the associated DOM element.

		Remarks: If the attribute is being set to undefined, null, or the empty
		string, it is removed instead. Attributes may be set to null.

	*/
	Backbone.outback.bindingHandlers['attr'] = (function() {
		function optionsFor(valueAccessor, allBindingsAccessor) {
			var config, parents, binding, options, classOptions;

			config = {
				escape: true
			};

			parents = valueAccessor({parents: true});
			if (parents.length !== 1) {
				return undefined;
			}

			config.attrName = parents[0];

			binding = allBindingsAccessor('attr');
			if (hop(binding, config.attrName + 'Options')) {
				options = binding[config.attrName + 'Options'];
				if(options && hop(options, 'escape')) {
					config.escape = !!options.escape;
				}
			}
			
			return config;
		}

		return {
			update: function (element, valueAccessor, allBindingsAccessor, view) {
				var config, attrName, attrValue;

				config = optionsFor(valueAccessor, allBindingsAccessor);
				if(_.isUndefined(config)) return;

				attrName = config.attrName;
				attrValue = valueAccessor({escape: config.escape})();

				if (_.isUndefined(attrValue) || _.isNull(attrValue)) {
					$(element).removeAttr(attrName);
					return;
				}

				attrValue = attrValue.toString();
				if (attrValue === '') {
					$(element).removeAttr(attrName);
					return;
				}

				$(element).attr(attrName, attrValue);
			}
		}
	})();

	// Working with Form Fields
	//
	
	/*  The "enable" binding

		Usage:
		data-bind="enable: @modelAttr"

			@modelAttr is interpreted as truthy or falsy
		
		Purpose: The enable binding causes the associated DOM element to be
		enabled only when the parameter value is true.
	*/
	Backbone.outback.bindingHandlers['enable'] = (function() {
		return {
			update: function (element, valueAccessor, allBindingsAccessor, view) {
				var enabled;
				enabled = !!valueAccessor()();
				$(element).prop('disabled', !enabled);
			}
		}
	})();
	
	/*  The "disable" binding

		Usage:
		data-bind="disable: @modelAttr"

			@modelAttr is interpreted as truthy or falsy
		
		Purpose: The disable binding causes the associated DOM element to be
		disable only when the parameter value is true.
	*/
	Backbone.outback.bindingHandlers['disable'] = (function() {
		return {
			update: function (element, valueAccessor, allBindingsAccessor, view) {
				var disabled;
				disabled = !!valueAccessor()();
				$(element).prop('disabled', disabled);
			}
		}
	})();

	/*	The "value" binding

		Usage:
		data-bind="value: @modelAttr, valueOptions { valueUpdate: 'eventName', escape: <truthy> }"

			valueUpdate defaults to 'change' if not specified

			escape controls whether or not an HTML-escaped version of a model's
			attribute is used.  Using escape to retrieve attributes will 
			prevent XSS attacks.  The default is true.

		Purpose: The value binding links the associated DOM element’s value 
		with a property on your view model. This is typically useful with 
		form elements such as <input>, <select> and <textarea>.
	*/
	Backbone.outback.bindingHandlers['value'] = (function() {
		function optionsFor(valueAccessor, allBindingsAccessor) {
			var config, options;

			config = {
				eventName: 'change',
				escape: true
			};

			options = allBindingsAccessor('valueOptions');
			if(options && hop(options, 'escape')) {
				config.escape = !!options.escape;
			}

			if(options && hop(options, 'valueUpdate')) {
				config.eventName = options.valueUpdate;
			}
			
			return config;
		}

		return {		
			init: function (element, valueAccessor, allBindingsAccessor, view) {
				var config;
				config = optionsFor(valueAccessor, allBindingsAccessor);

				$(element).on(config.eventName, function (e) {
					var value;
					value = $(element).val();
					valueAccessor()(value);
				});
			},
			update: function (element, valueAccessor, allBindingsAccessor, view) {
				var config, value;
				config = optionsFor(valueAccessor, allBindingsAccessor);

				value = valueAccessor({escape: config.escape})();
				$(element).val(value);
			},
			remove: function (element, valueAccessor, allBindingsAccessor, view) {
				var config;
				config = optionsFor(valueAccessor, allBindingsAccessor);

				$(element).off(config.eventName);	
			}
		}	
	})();

	/*	The "hasfocus" binding

		Usage:
		data-bind="hasfocus: @modelAttr"

			@modelAttr is interpreted as truthy or falsy

		Purpose: The hasfocus binding links a DOM element’s focus state with a
		model property. It is a two-way binding, so:

			* If you set the viewmodel property to true or false, the 
			  associated element will become focused or unfocused.

			* If the user manually focuses or unfocuses the associated element,
			  the model property will be set to true or false accordingly. This
			  is useful if you’re building sophisticated forms in which 
			  editable elements appear dynamically, and you would like to 
			  control where the user should start typing, or respond to the 
			  location of the caret.
	*/
	Backbone.outback.bindingHandlers['hasfocus'] = (function() {
		var domUpdate = function(element, valueAccessor, allBindingsAccessor, view) {
			$(element).on('focus', function (e) {
				valueAccessor()(true);
			});

			$(element).on('blur', function (e) {
				valueAccessor()(false);
			});
		};

		return {
			init: function (element, valueAccessor, allBindingsAccessor, view) {
				domUpdate(element, valueAccessor, allBindingsAccessor, view);
			},
			update: function (element, valueAccessor, allBindingsAccessor, view) {
				var $el, focus;
				$el = element;
				focus = !!valueAccessor()();

				$el.off('focus blur');
				$el[focus ? 'focus' : 'blur']();

				domUpdate(element, valueAccessor, allBindingsAccessor, view);
			},
			remove: function (element, valueAccessor, allBindingsAccessor, view) {
				$(element).off('focus blur');
			}		
		};
	})();

	/*	The "checked" binding

		Usage:
		data-bind="checked: @modelAttr"

			if the element is a checkbox, then @modelAttr is interpreted as 
			truthy or falsy; otherwise, if the element is a radio button
			@modelAttr is interpreted as the value of the radio button

		Purpose: The checked binding links a checkable form control — i.e., a 
		checkbox (<input type='checkbox'>) or a radio button 
		(<input type='radio'>) — with a property on your view model.
	*/
	Backbone.outback.bindingHandlers['checked'] = (function() {
		function domRead($el) {
			var checked, label;
			if ($el.attr('type') === 'checkbox') {
				checked = $el.attr('checked');
				return _.isUndefined(checked) ? false : true;
			} else{
				label = $el.val();
				return label;
			}			
		}

		function domWrite($el, actual) {
			var checked;
			switch($el.attr('type')) {
				case 'radio':
					checked = $el.val() === actual
					$el.prop('checked', checked);
					break;

				case 'checkbox':
				default:
					checked = !!actual;
					$el.prop('checked', checked);
					break;
			}
		}
		
		return {
			init: function (element, valueAccessor, allBindingsAccessor, view) {
				$(element).on('change', function (e) {
					var domValue;
					domValue = domRead($(element));
					valueAccessor()(domValue);
				});			
			},
			update: function (element, valueAccessor, allBindingsAccessor, view) {
				var value;
				value = valueAccessor();
				domWrite($(element), value());
			},
			remove: function (element, valueAccessor, allBindingsAccessor, view) {
				$(element).off('change');
			}		
		};
	})();

}));
