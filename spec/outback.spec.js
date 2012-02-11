describe('outback.js declarative bindings for backbone', function() {

	AModel = Backbone.Model.extend({});

	beforeEach(function(){
		this.model = new AModel({
			villain: "mrMonster",
			doctor: "Seuss",
			pet: "cat",
			isValid: false
		});
	});

	describe("can be configured in the view rather than in the template", function() {

		UnobtrusiveView = Backbone.View.extend({
			modelBindings: {
				visible: Backbone.outback.modelRef('isValid')
			}
			render: function() {
				var html = $("<div id='anchor'><p>Hello, World</p></div>");
				this.$el.append(html);
				Backbone.outback.bind(this);
			},
			remove: function() {
				Backbone.outback.unbind(this);
			}
		});

		beforeEach(function(){
			this.view = new UnobtrusiveView({model: this.model});
			this.view.render();
			this.el = this.view.$("#anchor");
		});

		afterEach(function() {
			this.view.remove();
		});

		it("should hide the element when the associated model attribute is false", function() {
			var el;
			expect(el.is(":visible")).toBeFalsy();
			this.model.set({isValid: true});
			expect(el.is(":visible")).toBeTruthy();
		});

	});

});