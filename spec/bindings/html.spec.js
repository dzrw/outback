describe('the html binding', function() {

	beforeEach(function() {
		this.model = new AModel({content: '<p>Hello, world!</p>'});
		this.view = new FixtureView({model: this.model});
		_.extend(this.view, {
			innerHtml: "<span data-bind='html: @content'></span>"
		})

		this.view.render();
		this.el = this.view.$('#anchor span');				
	});

	afterEach(function() {
		this.view.remove();
	})

	it('should update the value of the DOM element when the model changes', function() {
		expect(this.el.size() > 0).toBeTruthy();
		expect(this.el.html()).toBe('<p>Hello, world!</p>');

		this.model.set({content: '<span>A fine span.</span>'});

		expect(this.el.html()).toBe('<span>A fine span.</span>');
	});

});
