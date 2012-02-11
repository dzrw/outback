Backbone.outback.bindingHandlers['nop'] = {
	init: function (element, valueAccessor, allBindingsAccessor, view) {},
	update: function (element, valueAccessor, allBindingsAccessor, view) {},
	remove: function (element, valueAccessor, allBindingsAccessor, view) {}		
};

AModel = Backbone.Model.extend({});

TypicalView = Backbone.View.extend({
	render: function() {
		var html = $("<div id='anchor'><p>Hello, World</p></div>");
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

