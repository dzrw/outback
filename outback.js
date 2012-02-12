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

	function parseDataBindAttrBindingDecls (view, model) {
		var bindingDecls, selector;

		bindingDecls = [];
		selector = "*[data-bind]";

		view.$(selector).each(function () { 
			var element, bindingExpr, directives;

			element = view.$(this);
			bindingExpr = element.attr('data-bind');
			directives = rj.parse(bindingExpr, makeBindingDeclReviver(model));

			bindingDecls.push({
				element: element,
				directives: directives
			});
		});

		return bindingDecls;
	}

	function parseUnobtrusiveBindingDecls (view, model) {
		var bindingDecls, root, viewAttr;

		bindingDecls = [];
		viewAttr = 'dataBindings';	// TODO: hard-coded view attribute should be configurable

		_.each(view[viewAttr], function(value, selector) {
			if(!hop(view[viewAttr], selector)) return;

			var element, directives;
			element = view.$(selector);

			if(element.size() !== 0) {
				directives = rj.revive(value, makeUnobtrusiveBindingDeclReviver(model));

				bindingDecls.push({
					element: element,
					directives: directives
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
		var binders, binderArgs, modelEventName, updateFn;

		binders = {
			modelSubs: [],
			inits: [],
			updates: [],
			removes: [],
			modelUnsubs: []
		};

		modelEventName = typeof binding.modelEventName === 'string' ? binding.modelEventName : false;
		binderArgs = [binding.element, binding.valueAccessor, binding.allBindingsAccessor, view];

		function nop() {}

		updateFn = hop(binding.handler, 'update') ? binding.handler.update : nop;

		binders.updates.push(function() { 
			updateFn.apply(view, binderArgs); 
		});

		binders.modelSubs.push(function() {
			binding.modelEvents.subscribe(modelEventName, function(m, val) {
				updateFn.apply(view, binderArgs);	
			});
		});

		binders.modelUnsubs.push(function () {
			binding.modelEvents.unsubscribe(modelEventName);
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

	var OutbackBinder = function (view, model, bindingHandlers) {
		var allBinders;

		allBinders = {
			modelSubs: [],
			inits: [],
			updates: [],
			removes: [],
			modelUnsubs: []
		};

		this.bind = function () {
			var bindingDecls, bindings, summary;

			summary = {
				executableBindingsInstalled: 0
			};

			bindingDecls = [];
			arrayConcat(bindingDecls, parseDataBindAttrBindingDecls(view, model));
			arrayConcat(bindingDecls, parseUnobtrusiveBindingDecls(view, model));

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

			// Fire a single model change event to sync the DOM.

			//model.trigger('change');

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
			view.__outback_binder = new OutbackBinder(view, view.model, Backbone.outback.bindingHandlers);	// TODO: Support for Collections
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
		data-bind="visible: @modelAttr"

			@modelAttr is interpreted as truthy or falsy
		
		Purpose: The visible binding causes the associated DOM element to 
		become hidden or visible according to the value you pass to the 
		binding.
	*/
	Backbone.outback.bindingHandlers['visible'] = {
		update: function (element, valueAccessor, allBindingsAccessor, view) {
			var value, methodName;
			value = valueAccessor();
			methodName = !!value() ? 'show' : 'hide';
			$(element)[methodName]();
		}
	};

	/*	The "text" binding

		Usage:
		data-bind="text: @modelAttr, escape: <truthy>"

			escape controls whether or not an HTML-escaped version of a model's
			attribute is used.  Using escape to retrieve attributes will 
			prevent XSS attacks.  The default is true.

		Purpose: The text binding causes the associated DOM element to display
		the text value of your parameter.
	*/
	Backbone.outback.bindingHandlers['text'] = {
		update: function (element, valueAccessor, allBindingsAccessor, view) {
			var value, options, next;

			options = {
				escape: allBindingsAccessor.testBoolean('escape', true)
			};			

			value = valueAccessor(options);
			next = value();
			$(element).text(next);
		}
	};

	/*	The "html" binding

		Usage:
		data-bind="html: @modelAttr"

		Purpose: The html binding causes the associated DOM element to display
		the HTML specified by your parameter.

		Remarks: The escape option is not honored by this binding because
		jQuery provides its own XSS protection. 
	*/
	Backbone.outback.bindingHandlers['html'] = {
		update: function (element, valueAccessor, allBindingsAccessor, view) {
			var value, options, next;
			value = valueAccessor(options);
			next = value();
			$(element).html(next);
		}
	};

	/*	The "css" binding

		Usage:
		data-bind="css: { class1: @modelAttr1, class2: @modelAttr2 }"

			@modelAttr is interpreted as truthy or falsy

		Purpose: The css binding adds or removes one or more named CSS classes
		to the associated DOM element.
	*/
	Backbone.outback.bindingHandlers['css'] = {
		update: function (element, valueAccessor, allBindingsAccessor, view) {
			var binding;
			binding = allBindingsAccessor('css');

			var parents, value, className, hasClass;
			parents = valueAccessor({parents: true});
			if (parents.length !== 1) return;
			className = parents[0];
			hasClass = valueAccessor()();

			$(element)[hasClass ? 'addClass' : 'removeClass'](className);	
		}
	};

	/*	The "attr" binding

		Usage:
		data-bind="attr: { attr1: @modelAttr1, attr2: @modelAttr2 }, escape: <truthy>"

			@modelAttr is interpreted as attribute values
			
			escape controls whether or not an HTML-escaped version of a model's
			attribute is used.  Using escape to retrieve attributes will 
			prevent XSS attacks.  The default is true.

		Purpose: The attr binding provides a generic way to set the value of
		any attribute for the associated DOM element.

		Remarks: If the attribute is being set to undefined, null, or the empty
		string, it is removed instead. Attributes may be set to null.

	*/
	Backbone.outback.bindingHandlers['attr'] = {
		update: function (element, valueAccessor, allBindingsAccessor, view) {
			var $el, binding, options;
			$el = element;
			binding = allBindingsAccessor('css');
			
			options = {
				escape: allBindingsAccessor.testBoolean('escape', true)
			};

			var parents, value, className, hasClass;
			parents = valueAccessor({parents: true});
			if (parents.length !== 1) return;
			attrName = parents[0];
			attrValue = valueAccessor(options)();

			if (_.isUndefined(attrValue) || _.isNull(attrValue)) {
				$el.removeAttr(attrName);
				return;
			}

			attrValue = attrValue.toString();
			if (attrValue === '') {
				$el.removeAttr(attrName);
				return;
			}

			$el.attr(attrName, attrValue);
		}
	};

	// Working with Form Fields
	//
	
	/*  The "enable" binding

		Usage:
		data-bind="enable: @modelAttr"

			@modelAttr is interpreted as truthy or falsy
		
		Purpose: The enable binding causes the associated DOM element to be
		enabled only when the parameter value is true.
	*/
	Backbone.outback.bindingHandlers['enable'] = {
		update: function (element, valueAccessor, allBindingsAccessor, view) {
			var enabled;
			enabled = !!valueAccessor()();
			if(enabled) {
				$(element).removeAttr('disabled');
			} else {
				$(element).attr('disabled', 'disabled');
			}
		}
	};
	
	/*  The "disable" binding

		Usage:
		data-bind="disable: @modelAttr"

			@modelAttr is interpreted as truthy or falsy
		
		Purpose: The disable binding causes the associated DOM element to be
		disable only when the parameter value is true.
	*/
	Backbone.outback.bindingHandlers['disable'] = {
		update: function (element, valueAccessor, allBindingsAccessor, view) {
			var disabled;
			disabled = !!valueAccessor()();
			if(disabled) {
				$(element).attr('disabled', 'disabled');
			} else {
				$(element).removeAttr('disabled');
			}
		}
	};

	/*	The "value" binding

		Usage:
		data-bind="value: @modelAttr, valueUpdate: 'eventName', escape: <truthy>"

			valueUpdate defaults to 'change' if not specified

			escape controls whether or not an HTML-escaped version of a model's
			attribute is used.  Using escape to retrieve attributes will 
			prevent XSS attacks.  The default is true.

		Purpose: The value binding links the associated DOM element’s value 
		with a property on your view model. This is typically useful with 
		form elements such as <input>, <select> and <textarea>.
	*/
	Backbone.outback.bindingHandlers['value'] = {
		init: function (element, valueAccessor, allBindingsAccessor, view) {
			var options, eventName;
			eventName = allBindingsAccessor.testString('valueUpdate', "change");

			options = {
				escape: allBindingsAccessor.testBoolean('escape', true)
			};			

			$(element).on(eventName, function (e) {
				var value, next;
				value = valueAccessor(options);
				next = $(this).val();
				value(next);
			});
		},
		update: function (element, valueAccessor, allBindingsAccessor, view) {
			var value, next, options;
			options = {
				escape: allBindingsAccessor.testBoolean('escape', true)
			};			

			value = valueAccessor(options);
			next = value();
			$(element).val(next);
		},
		remove: function (element, valueAccessor, allBindingsAccessor, view) {
			var eventName;
			eventName = allBindingsAccessor.testString('valueUpdate', "change");

			$(element).off(eventName);
		}		
	};

}));
