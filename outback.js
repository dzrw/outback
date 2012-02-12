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

		valueAccessor = function() {
			return function() {
				var args, modelAttr;
				args = Array.prototype.slice.call(arguments);
				if (args.length === 0) {
					modelAttr = model.get(modelAttrName);
					return modelAttr;
				} else {
					modelAttr = args[0];
					model.set(modelAttrName, modelAttr);
				}
			};
		}


		return { 
			modelAttrName: modelAttrName,
			valueAccessor: valueAccessor,
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

	function filterExecutableBindings (bindingDecl, bindingHandlers) {
		var allBindings, bindingHandlers, allBindingsAccessor

		allBindings = {};
		executableBindings = [];
		allBindingsAccessor = function() { return allBindings; };
		
		_.each(bindingDecl.directives, function(binding, key) {
			var executableBinding;

			if (hop(bindingHandlers, key)) {
				_.extend(executableBinding = {}, binding, {
					element: bindingDecl.element,
					handler: bindingHandlers[key],
					allBindingsAccessor: allBindingsAccessor
				});

				executableBindings.push(executableBinding);
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

	// Attribute Usage: 
	//   data-bind="visible: @modelAttr"
	// 
	// Unobtrusive Usage:
	//   dataBindings:
	//     'selector': { visible: Backbone.outback.modelRef('modelAttr') }
	//
	Backbone.outback.bindingHandlers['visible'] = {
		update: function (element, valueAccessor, allBindingsAccessor, view) {
			var value, methodName;
			value = valueAccessor();
			methodName = !!value() ? 'show' : 'hide';
			$(element)[methodName]();
		}
	};

	// Attribute Usage: 
	//   data-bind="value: @modelAttr"
	// 
	// Unobtrusive Usage:
	//   dataBindings:
	//     'selector': { value: Backbone.outback.modelRef('modelAttr') }
	//
	Backbone.outback.bindingHandlers['value'] = {
		init: function (element, valueAccessor, allBindingsAccessor, view) {
			var allBindings, eventName;
			allBindings = allBindingsAccessor();
			eventName = hop(allBindings, 'valueUpdate') ? allBindings.valueUpdate : "change";

			$(element).on(eventName, function (e) {
				var value, next;
				value = valueAccessor();
				next = $(this).val();
				value(next);
			});
		},
		update: function (element, valueAccessor, allBindingsAccessor, view) {
			var value, next;
			value = valueAccessor();
			next = value();
			$(element).val(next);
		},
		remove: function (element, valueAccessor, allBindingsAccessor, view) {
			var allBindings, eventName;
			allBindings = allBindingsAccessor();
			eventName = hop(allBindings, 'valueUpdate') ? allBindings.valueUpdate : "change";

			$(element).off(eventName);
		}		
	};


}));
