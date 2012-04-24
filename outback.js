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
		function optionsFor(args) {
			var options;

			_.extend(options = {}, {
				escape: false,
				silent: false,
				readMethod: 'get',
				previewError: false
			});

			if (args && args.length === 1) {
				_.extend(options, args[0]);
			}

			options.readMethod = options.escape ? 'escape' : 'get';
			return options;
		}

		return function(binding) {
			var modelAttrName;
			modelAttrName = binding.modelAttrName;

			var valueAccessor = function() {
				var options;
				options = optionsFor(Array.prototype.slice.call(arguments));

				if (!!options.parents) {
					return binding.parents;
				}

				var value = function() {
					var args, modelAttr, changeSet, changeSetOptions;
					args = Array.prototype.slice.call(arguments);
					if (args.length === 0) {
						modelAttr = model[options.readMethod](modelAttrName);
						return modelAttr;
					} else {
						changeSet = {};
						changeSet[modelAttrName] = args[0];

						changeSetOptions = {};

						if (!!options.silent) {
							changeSetOptions.silent = true;							
						}

						if (!!options.previewError) {
							changeSetOptions.error = binding.previewError;
						}

						model.set(changeSet, changeSetOptions);
					}
				};

				return value;
			};

			return valueAccessor;
		};
	}

	function makeBindingDeclToModelAttr (model, modelAttrName) {
		var subscribe, unsubscribe, valueAccessor;

		subscribe = function(eventName, callback) {
			model.on(eventName, callback);
		};

		unsubscribe = function(eventName) {
			model.off(eventName);
		};

		return { 
			modelAttrName: modelAttrName,
			valueAccessor: makeValueAccessorBuilder(model),
			modelEvents: {
				eventName: "change:" + modelAttrName,
				subscribe: subscribe,
				unsubscribe: unsubscribe
			}
		};		
	}

	function makeBindingDecl (model, symbol) {
		if (!symbol) { return false; }

		// If the symbol is a Backbone.Model attribute, bind to that.
		if (hop(model.attributes, symbol)) {
			return makeBindingDeclToModelAttr(model, symbol);
		}

		// TODO: If the symbol is a function, bind to that.
		if (hop(model, symbol) && _.isFunction(model[symbol])) {}

		// Otherwise, construct a binding to a Backbone.Model attribute
		// despite the fact that it doesn't exist yet.
		return makeBindingDeclToModelAttr(model, symbol);
	}

	function makeDataBindAttrBindingDeclReviver (model) {
		function parseSymbol (value) {
			return !!value 
			    && hop(value, '__symbol_literal') 
			    && value['__symbol_literal'];
		}

		return function(k, value) {
			return makeBindingDecl (model, parseSymbol(value)) || value;
		};    
	}

	function makeUnobtrusiveBindingDeclReviver (model) {
		function parseSymbol (value) {
			return !!value 
			    && value instanceof OutbackModelRef 
			    && value.modelAttrName;
		}

		return function(k, value) {
			return makeBindingDecl (model, parseSymbol(value)) || value;
		};    
	}

	function parseDataBindAttrBindingDecls (databindAttr, view, model) {
		var bindingDecls, selector;

		bindingDecls = [];
		selector = "["+databindAttr+"]";

		view.$(selector).each(function () { 
			var element, bindingExpr, directives;

			element = view.$(this);
			bindingExpr = element.attr(databindAttr);
			directives = rj.parse(bindingExpr, makeDataBindAttrBindingDeclReviver(model));

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
			element = selector === '' ? view.$el : view.$(selector);

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

	function improveExecutableBinding(binding, view) {
		if (hop(binding.handler, 'previewError')) {
			binding.previewError = function(model, error) {
				var binderArgs, e, preventDefault;
				e = {error: error, preventDefault: false};
				binderArgs = [binding.element, binding.valueAccessor, binding.allBindingsAccessor, view, e];
				binding.handler.previewError.apply(view, binderArgs);
				if (!e.preventDefault) {
					model.trigger('error', error);
				}
			};
		}
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

		binderArgs = [binding.element, binding.valueAccessor, binding.allBindingsAccessor, view];

		if (!hop(binding.handler, 'update')) {
			return undefined;
		}

		updateFn = binding.handler.update;

		binders.updates.push(function() { 
			updateFn.apply(view, binderArgs); 
		});

		binders.modelSubs.push(function() {
			binding.modelEvents.subscribe(binding.modelEvents.eventName, function(m, val) {
				updateFn.apply(view, binderArgs);	
			});
		});

		binders.modelUnsubs.push(function () {
			binding.modelEvents.unsubscribe(binding.modelEvents.eventName);
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

			_.each(bindings, function (binding) { 
				improveExecutableBinding(binding, view);
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

	Backbone.View.prototype.modelref = function(name) {
		return Backbone.outback.modelRef(name);
	}

	// ===================================
	// STANDARD BINDING HANDLERS
	// ===================================

	// Controlling Text and Appearance
	// ===================================

	/*  The "visible" binding

		Usage:
		data-bind="visible: @modelAttr"

			@modelAttr is interpreted as truthy or falsy

		Purpose: The visible binding causes the associated DOM element to 
		become hidden or visible according to the value you pass to the 
		binding.
	*/
	Backbone.outback.bindingHandlers['visible'] = (function() {
		return {
			update: function (element, valueAccessor, allBindingsAccessor, view) {
				var value, names, index;
				
				var names = ['show', 'hide'];
				var index = !!valueAccessor()() ? 0 : 1;

				$(element)[names[index]]();
			}
		}
	})();

	/*  The "invisible" binding

		Usage:
		data-bind="invisible: @modelAttr"

			@modelAttr is interpreted as truthy or falsy

		Purpose: The invisible binding causes the associated DOM element 
		to become hidden or visible according to the value you pass to the 
		binding.
	*/
	Backbone.outback.bindingHandlers['invisible'] = (function() {
		return {
			update: function (element, valueAccessor, allBindingsAccessor, view) {
				var value, names, index;
				
				var names = ['hide', 'show'];
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
		data-bind="css: { class1: @modelAttr1, class2: @modelAttr2, class2Options: { not: <truthy>, on: <string> } }"

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
	// ===================================
	
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
		data-bind="value: @modelAttr, valueOptions { valueUpdate: 'eventName', escape: <truthy>, silent: <truthy> }"

			valueUpdate defaults to 'change' if not specified

			escape controls whether or not an HTML-escaped version of a model's
			attribute is used.  Using escape to retrieve attributes will 
			prevent XSS attacks.  The default is true.

			silent determines whether setting the model triggers validation.
			The default is false.

		Purpose: The value binding links the associated DOM element’s value 
		with a property on your view model. This is typically useful with 
		form elements such as <input>, <select> and <textarea>.
	*/
	Backbone.outback.bindingHandlers['value'] = (function() {
		function optionsFor(valueAccessor, allBindingsAccessor) {
			var config, options;

			config = {
				eventName: 'change',
				escape: true,
				silent: false,
				previewError: true
			};

			options = allBindingsAccessor('valueOptions');
			if(options && hop(options, 'escape')) {
				config.escape = !!options.escape;
			}

			if(options && hop(options, 'valueUpdate')) {
				config.eventName = options.valueUpdate;
			}

			if(options && hop(options, 'silent')) {
				config.silent = !!options.silent;
			}
			
			return config;
		}

		return {		
			init: function (element, valueAccessor, allBindingsAccessor, view) {
				var config, writeOptions;
				config = optionsFor(valueAccessor, allBindingsAccessor);

				writeOptions = {
					silent: config.silent,
					previewError: config.previewError
				};

				$(element).on(config.eventName, function (e) {
					var value;
					value = $(element).val();
					valueAccessor(writeOptions)(value);
				});
			},
			update: function (element, valueAccessor, allBindingsAccessor, view) {
				var config, value, readOptions;
				config = optionsFor(valueAccessor, allBindingsAccessor);

				readOptions = {escape: config.escape};

				value = valueAccessor(readOptions)();
				$(element).val(value);
			},
			remove: function (element, valueAccessor, allBindingsAccessor, view) {
				var config;
				config = optionsFor(valueAccessor, allBindingsAccessor);

				$(element).off(config.eventName);	
			},
			previewError: function (element, valueAccessor, allBindingsAccessor, view, e) {
				var error = e.error;
				// TODO: Do something useful.
				e.preventDefault = false;
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
			var checked, value, comparand;
			switch($el.attr('type')) {
				case 'radio':
					value = $el.val(); 
					comparand = _.isString(value) ? '' + actual : actual;
					checked = value === comparand
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


	// Working with Collections
	// ===============================

		
	// Other Miscellaneous Bindings
	// ===============================


	/*	The "plural" binding

		Usage:
		data-bind="plural: @modelAttr, pluralOptions: { word: 'singularForm', lang: 'enUS' } }"

			if count is not at number, then it is interpreted as a truthy value
			where true is 1 and false is 0

			word should be the singular form of the word. The default is 'item'

			lang is the ISO language code for the word. This parameter is currently ignored.

		Purpose: The plural binding causes the associated DOM element to display
		the singular form of the word specified by the word parameter if the count
		is 1; otherwise, the plural form is displayed.
	*/
	Backbone.outback.bindingHandlers['plural'] = (function() {
		function optionsFor(valueAccessor, allBindingsAccessor) {
			var config, options;

			config = {
				word: 'item',
				lang: 'enUS'
			};
					
			options = allBindingsAccessor('pluralOptions');
			if (options && hop(options, 'word')) {
				config.word = ''+options.word;
			}
			
			return config;
		}

		function pluralize(count, word, lang)
		{
			if (count === 1) {
				return word;
			} else {
				return '' + word + 's'; // TODO: Get the real algorithm.
			}
		}

		return {
			update: function (element, valueAccessor, allBindingsAccessor, view) {
				var config, count, text;
				config = optionsFor(valueAccessor, allBindingsAccessor);

				count = valueAccessor()();
				if (!_.isNumber(count)) {
					count = !!count ? 1 : 0
				}

				text = pluralize(count, config.word, config.lang);

				$(element).text(text);
			}
		}
	})();


	/*	The "currency" binding

		Usage:
		data-bind="currency: @modelAttr, currencyOptions: { format: <formatspec> }"

			formatspec is a string which describes how a monetary value must be
			rendered. This string must match the RegExp,

			    /^([^\d]*)9([^\d]?)999([^\d])99([^\d]*)$/

			where the capture groups are interpreted as follows:

				$1 is an optional prefix; typically a currency sign ($)
				$2 is an optional thousands separator
				$3 is the decimal separator
				$4 is an optional suffix; typically a currency abbreviation (USD)

			The default format specifier is '$9,999.99'.

			negativeClass is the name of a CSS class to add to the element 
			when the value is less than 0. The default is 'currency-negative'.

		Purpose: The currency binding causes the associated DOM element to 
		display the text value of the bound symbol formatted as a currency.
	*/
	Backbone.outback.bindingHandlers['currency'] = (function() {
		function optionsFor(valueAccessor, allBindingsAccessor) {
			var config, options;

			config = {
				format: [ '$', ',', '.', '' ]
			};
					
			options = allBindingsAccessor('currencyOptions');
			if (options && hop(options, 'format')) {
				config.format = parseFormatSpec(options.format) || config.format;
			}

			return config;
		}

		function parseFormatSpec(formatSpec) {
			var re, m;
			re = /^([^\d]*)9([^\d]?)999([^\d])99([^\d]*)$/;
			m = re.exec(formatSpec);
			if (_.isArray(m)) {
				m.shift();
				return m;
			}
		}

		// http://stackoverflow.com/questions/149055/how-can-i-format-numbers-as-money-in-javascript
		// with modifications to specify radix in parseInt, to wrap negative values in parens, and 
		// to display a currency symbol if specified
		function formatMoney (c, prefix, t, d, suffix) {
			var n = this, 
				c = isNaN(c = Math.abs(c)) ? 2 : c, 
				d = d == undefined ? "," : d, 
				t = t == undefined ? "." : t, 
				s1 = n < 0 ? "(" : "",
				s2 = n < 0 ? ")" : "",
				prefix = prefix == undefined ? "" : prefix,
				suffix = suffix == undefined ? "" : suffix,
				i = parseInt(n = Math.abs(+n || 0).toFixed(c), 10) + "", 
				j = (j = i.length) > 3 ? j % 3 : 0;

		   return s1 
		        + prefix 
		        + (j ? i.substr(0, j) + t : "") 
		        + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) 
		        + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "") 
		        + suffix 
		        + s2;
		};

		return {
			update: function (element, valueAccessor, allBindingsAccessor, view) {
				var config, value;
				config = optionsFor(valueAccessor, allBindingsAccessor);

				value = valueAccessor()();
				value = _.isNaN(+value) ? 'NaN' : formatMoney.apply(value, [2].concat(config.format));

				$(element).text(value);
			},

			parseFormatSpec: parseFormatSpec
		}
	})();	

}));
