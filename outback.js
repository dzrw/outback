// AMD anonymous module enclosure.  Registers into the Backbone namespace
// as Backbone.outback.

(function(root, factory) {
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
		Array.prototype.push.call(first, second);
	}

	function hop(context, p) {
		return Object.prototype.hasOwnProperty.call(context, p);
	}

	function makeBindingDecl (model, modelAttrName) {
		var bind, unbind, valueAccessor;

		bind = function(eventName, callback) {
			var eventName;
			eventName = eventName || "change:" + modelAttrName;
			model.on(eventName, callback);
		};

		unbind = function(eventName) {
			var eventName;
			eventName = eventName || "change:" + modelAttrName;
			model.off(eventName);
		};

		valueAccessor = function() {
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

		return { 
			modelAttrName: modelAttrName,
			bind: bind,
			unbind: unbind,
			valueAccessor: valueAccessor
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

			interesting = k === 'modelAttrName';
			modelAttrName = value;

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
			var element, bindingExpr, options;

			element = view.$(this);
			bindingExpr = element.attr('data-bind');
			options = rj.parse(bindingExpr, makeBindingDeclReviver(model));

			bindingDecls.push({
				element: element,
				options: options
			});
		});

		return bindingDecls;
	}

	function parseUnobtrusiveBindingDecls (view, model) {
		var bindingDecls, root;

		bindingDecls = [];

		if (!hop(view, 'modelBindings')) return;

		_.each(view.modelBindings, function(value, selector) {
			var element, options;

			if(!hop(view.modelBindings, selector)) return;

			element = view.$(selector);

			if(element.size() === 0) return;

			options = rj.revive(value, makeUnobtrusiveBindingDeclReviver(model));

			bindingDecls.push({
				element: element,
				options: options
			});
		});

		return bindingDecls;
	}

	function filterExecutableBindings (bindingDecl, bindingHandlers) {
		var allBindings, bindingHandlers, allBindingsAccessor

		allBindings = {};
		executableBindings = [];
		allBindingsAccessor = function() { return allBindings; };
		
		_.each(bindingDecl, function(value, key) {
			if (!hop(bindingDecl, key)) return;

			if (hop(bindingHandlers, key)) {
				executableBindings.push({
					binding: value,
					bindingHandler: bindingHandlers[key],
					allBindingsAccessor: allBindingsAccessor
				});
			}

			allBindings[key] = value;        
		});

		return executableBindings;
	}

	function applyBinding (executableBindings) {
		var binders;

		binders = {
			inits: [],
			updates: [],
			unbinds: []
		};

		_.each(executableBindings, function(executableBinding) {
			var bindingHandler, value, allBindingsAccessor, args;

			bindingHandler = item[0];
			value = item[1];
			allBindingsAccessor = item[2];

			args = [element, modelAccessor.valueAccessor, allBindingsAccessor, view ];

			if (hop(bindingHandler, 'init')) {
				binders.inits.push(function() { 
					bindingHandler.init.apply(view, args); 
				});
			}

			if (hop(bindingHandler, 'update')) {
				binders.updates.push(function() { 
					bindingHandler.update.apply(view, args); 
				});
	
				modelAccessor.listen(false, function (m, val) {
					bindingHandler.update.apply(view, args);
				});
			}

			if (hop(bindingHandler, 'remove')) {
				binders.unbinds.push(function() { 
					modelAccessor.unbind();
					bindingHandler.unbind.apply(view, args); 
				});
			}
		});
		
		return binders;	
	}

	var OutbackBinder = function (view, model, bindingHandlers, options) {
		var allBinders;

		allBinders = {
			inits: [],
			updates: [],
			removes: [],
		};

		var eachfn = function (list) {
			_.each(list, function(fn, i) { 
				if (typeof fn === 'function') {
					fn(); 
				}
			});
		}

		this.bind = function () {
			var bindingDecls, bindings;

			bindingDecls = [];
			arrayConcat(bindingDecls, parseDataBindAttrBindingDecls(view, model));
			arrayConcat(bindingDecls, parseUnobtrusiveBindingDecls(view, model));

			bindings = [];
			_.each(bindingDecls, function (bindingDecl) {
				arrayConcat(bindings, filterExecutableBindings(bindingDecl, bindingHandlers));
			});

			_.each(bindings, function (binding) {
				binders = applyBinding(binding);

				arrayConcat(allBinders.inits, binders.inits);
				arrayConcat(allBinders.updates, binders.updates);
				arrayConcat(allBinders.removes, binders.unbinds);
			})

			// First run all the inits, so bindings can register for notification on changes
			eachfn(allBinders.inits);

			// ... then run all the updates, which might trigger changes even on the first evaluation
			eachfn(allBinders.updates);
		},

		this.unbind = function () {
			eachfn(allBinders.removes);
		}
	}	
	
	// PUBLIC API FOR BACKBONE VIEWS
	// @render: -> ModelBinding.bind @, options
	// @remove: -> ModelBinding.unbind @
	Backbone.outback = {
		version: "0.1.0",
		bind: function(view, options){
			view.__outback_binder = new OutbackBinder(view, view.model, bindingHandlers, options);	// TODO: Support for Collections
			view.__outback_binder.bind();
		},

		unbind: function(view){
			if (view.__outback_binder){
				view.__outback_binder.unbind()
			}
		},
		
		bindingHandlers: {}		
	};
}));
