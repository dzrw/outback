describe('the hasfocus binding', function() {

	beforeEach(function() {
		this.model = new AModel({isSelected: false});
		this.view = new FixtureView({model: this.model});
		_.extend(this.view, {
			innerHtml: "\
			<input data-bind='hasfocus: @isSelected' /> \
			<span data-bind='visible: @isSelected'>The input box has focus.</span>"
		})

		this.view.render();
		this.el = this.view.$('#anchor input');				
	});

	afterEach(function() {
		this.view.remove();
	})

	it('should initialize into a stable state', function() {
		expect(this.model.get('isSelected')).toBe(false);
		expect(this.el.is(":focus")).toBeFalsy();
	});

	it('should update the focus of the DOM element when the model changes', function() {
		runs(function() { 
			this.model.set({isSelected: true});
		});

		waitsFor(function() {
			return this.el.is(":focus");
		}, "the element to receive focus.", 1000);

		runs(function() { 
			this.model.set({isSelected: false});
		});

		waitsFor(function() {
			return !this.el.is(":focus");
		}, "the element to lose focus.", 1000);
	});
	
	it('should update the model when the focus of the DOM element changes', function() {

		runs(function() { 
			this.el.focus(); 
		});

		waitsFor(function() {
			return this.model.get('isSelected') === true
		}, "the model attribute to be set to true.", 1000);

		runs(function() { 
			this.el.blur(); 
		});

		waitsFor(function() {
			return this.model.get('isSelected') === false
		}, "the model attribute to be set to false.", 1000);
	});
});