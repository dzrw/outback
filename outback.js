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


	var ModelBinder = function(view, options){

		this.config = new modelBinding.Configuration(options);
		this.modelBindings = [];
		this.elementBindings = [];

		this.bind = function(){
			var binder = {};
			var conventionSelector = "*[data-bind]";
			binder.bind.call(this, conventionSelector, view, view.model, this.config);
		};

		this.unbind = function(){
			// unbind the html element bindings
			_.each(this.elementBindings, function(binding){
				binding.element.unbind(binding.eventName, binding.callback);
			});

			// unbind the model bindings
			_.each(this.modelBindings, function(binding){
				binding.model.unbind(binding.eventName, binding.callback);
			});
		};

		this.pushModelBindings = function(model, eventName, callback){
			this.modelBindings.push({model: model, eventName: eventName, callback: callback});
		};
		this.pushElementBinding = function(element, eventName, callback){
			this.elementBindings.push({element: element, eventName: eventName, callback: callback});
		};
	};

	// PUBLIC API FOR BACKBONE VIEWS
	// @render: -> ModelBinding.bind @, options
	// @remove: -> ModelBinding.unbind @
	Backbone.outback = {
		version: "0.1.0",
		bind: function(view, options){
			view.modelBinder = new ModelBinder(view, options);
			view.modelBinder.bind();
		},

		unbind: function(view){
			if (view.modelBinder){
				view.modelBinder.unbind()
			}
		}
	};
}));
