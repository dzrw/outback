describe('the enable binding', function() {

	beforeEach(function() {
		this.model = new AModel({hasCellphone: false});
		this.view = new FixtureView({model: this.model});
		_.extend(this.view, {
			innerHtml: "<input type='text' data-bind='enable: @hasCellphone'>"
		})

		this.view.render();
		this.el = this.view.$('#anchor input');				
	});

	afterEach(function() {
		this.view.remove();
	})

	it('should update the value of the DOM element when the model changes', function() {
		expect(this.el.is(":enabled")).toBeFalsy();

		this.model.set({hasCellphone: true});

		expect(this.el.is(":enabled")).toBeTruthy();
	});

});