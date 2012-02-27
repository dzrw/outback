describe('the currency binding', function() {

	beforeEach(function() {
		this.model = new AModel({price: 0});
		this.view = new FixtureView({model: this.model});
		_.extend(this.view, {
			innerHtml: "<span></span>",
			modelBindings: {
				'span': {
					currency: Backbone.outback.modelRef('price')
				}
			}
		});
	});

	afterEach(function() {
		this.view.remove();
	})

	it('should update the value of the DOM element when the model changes', function() {
		this.view.render();
		this.el = this.view.$('#anchor span');				

		expect(this.el.size() > 0).toBeTruthy();
		expect(this.el.text()).toBe('$0.00');

		this.model.set({price: 1});
		expect(this.el.text()).toBe('$1.00');
	});
	
	it('should correctly parse format specifiers', function() {
		var match;
		match = Backbone.outback.bindingHandlers.currency.parseFormatSpec('prefix9!999?99suffix');

		expect(match).toBeDefined();
		expect(match[0]).toBe('prefix');
		expect(match[1]).toBe('!');
		expect(match[2]).toBe('?');
		expect(match[3]).toBe('suffix');
	});

	it('should be configurable', function() {
		this.view.modelBindings['span'].currencyOptions = {
			format: 'prefix9!999?99suffix'
		};

		this.view.render();
		this.el = this.view.$('#anchor span');				

		expect(this.el.text()).toBe('prefix0?00suffix');

		this.model.set({price: 2485999.95 });

		expect(this.el.text()).toBe('prefix2!485!999?95suffix');
	});

	it('should only show two decimal places', function() {
		this.view.render();
		this.el = this.view.$('#anchor span');				

		this.model.set({price: 3.1415 });

		expect(this.el.text()).toBe('$3.14');
	});


	it('should render non-numeric values as "NaN"', function() {
		this.view.render();
		this.el = this.view.$('#anchor span');				

		this.model.set({price: 'foo' });

		expect(this.el.text()).toBe('NaN');
	});	
});