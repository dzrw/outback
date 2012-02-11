Backbone.outback.bindingHandlers['nop'] = {
	init: function (element, valueAccessor, allBindingsAccessor, view) {},
	update: function (element, valueAccessor, allBindingsAccessor, view) {},
	remove: function (element, valueAccessor, allBindingsAccessor, view) {}		
};

AModel = Backbone.Model.extend({});

TypicalView = Backbone.View.extend({
	render: function() {
		var html = $("<div id='anchor'></div>");
		this.$el.append(html);
		Backbone.outback.bind(this);
	},
	remove: function() {
		Backbone.outback.unbind(this);
	}
});

UnobtrusiveView = TypicalView.extend({
	dataBindings: {
		'#anchor': { 
			visible: Backbone.outback.modelRef('isVisible') 
		}
	}
});

KnockoutView = Backbone.View.extend({
	render: function() {
		var html = $("<div id='anchor' data-bind='nop: @isVisible'></div>");
		this.$el.append(html);
		Backbone.outback.bind(this);
	},
	remove: function() {
		Backbone.outback.unbind(this);
	}
});

FixtureView = Backbone.View.extend({
    initialize: function() {
		this.setElement($('#fixture'));
    },

	render: function() {
		var html = $("<div id='anchor'></div>");
		this.$el.empty().append(html);
		Backbone.outback.bind(this);
	},
	remove: function() {
		Backbone.outback.unbind(this);
	}
});