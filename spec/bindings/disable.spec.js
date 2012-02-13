describe('the disable binding', function() {

	beforeEach(function() {
		this.model = new AModel({disabled: false});
		this.view = new FixtureView({model: this.model});
		_.extend(this.view, {
			innerHtml: "<input type='text' data-bind='disable: @disabled'>"
		})

		this.view.render();
		this.el = this.view.$('#anchor input');				
	});

	afterEach(function() {
		this.view.remove();
	})

	it('should update the value of the DOM element when the model changes', function() {
		expect(this.el.is(":disabled")).toBeFalsy();

		this.model.set({disabled: true});

		expect(this.el.is(":disabled")).toBeTruthy();
	});

});