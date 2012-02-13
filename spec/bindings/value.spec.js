describe('the value binding', function() {

	beforeEach(function() {
		this.model = new AModel({firstName: 'Abram'});
		this.view = new FixtureView({model: this.model});
		_.extend(this.view, {
			innerHtml: "<input type='text' data-bind='value: @firstName'>"
		})

		this.view.render();
		this.el = this.view.$('#anchor input');				
	});

	afterEach(function() {
		this.view.remove();
	})

	it('should update the value of the DOM element when the model changes', function() {
		expect(this.el.size() > 0).toBeTruthy();
		expect(this.el.val()).toBe('Abram');

		this.model.set({firstName: 'Abraham'});

		expect(this.el.val()).toBe('Abraham');
	});
	
	it('should update the model when the value of the DOM element changes', function() {
		expect(this.el.size() > 0).toBeTruthy();
		expect(this.el.val()).toBe('Abram');

		this.el.val('Abraham');
		this.el.trigger('change');

		expect(this.model.get('firstName')).toBe('Abraham');
	});

	describe('helps prevent XSS attacks', function() {
		var xssPayload = "<script>(function() { var xss = 'in ur page, hackin ur users'; })();</script>";
		var xssPayloadEscaped = '&lt;script&gt;(function() { var xss = &#x27;in ur page, hackin ur users&#x27;; })();&lt;&#x2F;script&gt;'

		beforeEach(function() {
			this.model = new AModel({content: xssPayload});
			this.view = new FixtureView({model: this.model});
			_.extend(this.view, {
				innerHtml: "<input type='text'>",
				modelBindings: {
					'#anchor input': {
						value: Backbone.outback.modelRef('content')
					}
				}
			});

			this.addMatchers({
				toHaveAnElementWithContent: function(selector, expected) {
					var $el;
					this.actual.render();
					$el = this.actual.$(selector);
					return $el.val() === expected;
				}
			});
		});

		afterEach(function() {
			this.view.remove();
		});

		it('should escape values from the model by default', function () {
			expect(this.view).toHaveAnElementWithContent('#anchor input', xssPayloadEscaped);
		});

		it('should allow you to shoot yourself in the foot', function () {
			this.view.modelBindings['#anchor input'].valueOptions = { escape: false };
			expect(this.view).toHaveAnElementWithContent('#anchor input', xssPayload);
		});

	});

});