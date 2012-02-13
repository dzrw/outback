describe('the css binding', function() {

	beforeEach(function() {
		this.model = new AModel({isActive: false, isCool: true});
		this.view = new FixtureView({model: this.model});
		_.extend(this.view, {
			innerHtml: "<span data-bind='css: { active: @isActive, cool: @isCool }'></span>"
		})

		this.view.render();
		this.el = this.view.$('#anchor span');				
	});

	afterEach(function() {
		this.view.remove();
	})

	it('should update the value of the DOM element when the model changes', function() {
		expect(this.el.hasClass('active')).toBeFalsy();
		expect(this.el.hasClass('cool')).toBeTruthy();

		this.model.set({isActive: true, isCool: false});

		expect(this.el.hasClass('active')).toBeTruthy();
		expect(this.el.hasClass('cool')).toBeFalsy();
	});

});