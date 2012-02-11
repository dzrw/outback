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
		var bindingDecls, root;

		bindingDecls = [];

		if (!hop(view, 'modelBindings')) return;

		_.each(view.modelBindings, function(value, selector) {
			var element, directives;

			if(!hop(view.modelBindings, selector)) return;

			element = view.$(selector);

			if(element.size() === 0) return;

			directives = rj.revive(value, makeUnobtrusiveBindingDeclReviver(model));

			bindingDecls.push({
				element: element,
				directives: directives
			});
		});

		return bindingDecls;
	}

	function filterExecutableBindings (bindingDecl, bindingHandlers) {
		var allBindings, bindingHandlers, allBindingsAccessor

		allBindings = {};
		executableBindings = [];
		allBindingsAccessor = function() { return allBindings; };
		
		_.each(bindingDecl.directives, function(binding, key) {
			if (!hop(bindingDecl, key)) return;

			if (hop(bindingHandlers, key)) {
				_.extend(binding, {
					element: bindingDecl.element,
					handler: bindingHandlers[key],
					allBindingsAccessor: allBindingsAccessor
				});

				executableBindings.push(binding);
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
			unbinds: [],
			modelUnsubs: []
		};

		modelEventName = typeof binding.modelEventName === 'string' ? binding.modelEventName : false;
		binderArgs = [binding.element, binding.valueAccessor, binding.allBindingsAccessor, view];

		function nop() {}

		updateFn = hop(binding.handler, 'update') ? binding.handler.update : nop;

		binders.updates.push(function() { 
			updateFn.apply(view, args); 
		});

		binders.modelSubs.push(function() {
			binding.modelEvents.subscribe(modelEventName, function(m, val) {
				updateFn.apply(view, args);	
			});
		});

		binders.modelUnsubs.push(function () {
			binding.modelEvents.unsubscribe(modelEventName);
		})

		if (hop(binding.handler, 'init')) {
			binders.inits.push(function() {
				binding.handler.init.apply(view, args); 
			});
		}

		if (hop(binding.handler, 'remove')) {
			binders.unbinds.push(function() { 
				binding.handler.unbind.apply(view, args); 
			});
		}

		return binders;	
	}

	var OutbackBinder = function (view, model, bindingHandlers, options) {
		var allBinders;

		allBinders = {
			modelSubs: [],
			inits: [],
			updates: [],
			unbinds: [],
			modelUnsubs: []
		};

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
				binders = applyBinding(view, binding);

				arrayConcat(allBinders.modelSubs, binders.modelSubs);
				arrayConcat(allBinders.inits, binders.inits);
				arrayConcat(allBinders.updates, binders.updates);
				arrayConcat(allBinders.removes, binders.unbinds);
				arrayConcat(allBinders.modelUnsubs, binders.modelUnsubs);
			});

			// Run binders in stages because we want to avoid cascades.

			eachfn(allBinders.inits);
			eachfn(allBinders.updates);
			eachfn(allBinders.modelSubs);

			// Fire a single model change event to sync the DOM.

			//model.trigger('change');
		},

		this.unbind = function () {
			eachfn(allBinders.modelUnsubs);
			eachfn(allBinders.removes);
		}
	}	
	
	// PUBLIC API FOR BACKBONE VIEWS
	// @render: -> Backbone.outback.bind @
	// @remove: -> Backbone.outback.unbind @
	Backbone.outback = {
		version: "0.1.0",
		bind: function(view){
			view.__outback_binder = new OutbackBinder(view, view.model, bindingHandlers);	// TODO: Support for Collections
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
