describe('the value binding', function() {

	describe('should work with input controls', function() {
	
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
		
	});

	describe('should work with select controls', function() {
	
		beforeEach(function() {
			this.model = new AModel({transport: 'car'});
			this.view = new FixtureView({model: this.model});
			_.extend(this.view, {
				innerHtml: "<select type='text' data-bind='value: @transport'> \
					<option value='car'>Car</option> \
					<option value='boat'>Boat</option> \
					<option value='train'>Train</option> \
				</select>"
			})

			this.view.render();
			this.el = this.view.$('#anchor select');				
		});

		afterEach(function() {
			this.view.remove();
		})

		it('should update the value of the DOM element when the model changes', function() {
			expect(this.el.size() > 0).toBeTruthy();
			expect(this.el.val()).toBe('car');

			this.model.set({transport: 'boat'});

			expect(this.el.val()).toBe('boat');
		});
		
		it('should update the model when the value of the DOM element changes', function() {
			expect(this.el.size() > 0).toBeTruthy();
			expect(this.el.val()).toBe('car');

			this.el.val('boat');
			this.el.trigger('change');

			expect(this.model.get('transport')).toBe('boat');
		});
		
	});

	describe('should work with select controls with multiple="multiple"', function() {

		beforeEach(function() {
			this.model = new AModel({car: 'volvo'});
			this.view = new FixtureView({model: this.model});
			_.extend(this.view, {
				innerHtml: 
				"<select type='text' multiple='multiple' data-bind='value: @car'> \
					<option value='volvo'>Volvo</option>\
					<option value='saab'>Saab</option>\
					<option value='mercedes'>Mercedes</option>\
					<option value='audi'>Audi</option>\
				</select>"
			})

			this.view.render();
			this.el = this.view.$('#anchor select');				
		});

		afterEach(function() {
			this.view.remove();
		})

		it('should update the value of the DOM element when the model changes', function() {
			expect(this.el.size() > 0).toBeTruthy();
			expect(this.el.val()).toContain('volvo');

			this.model.set({car: 'saab'});

			expect(this.el.val()).toContain('saab');
		});
		
		it('should update the model when the value of the DOM element changes', function() {
			expect(this.el.size() > 0).toBeTruthy();
			expect(this.el.val()).toContain('volvo');

			this.el.val('saab');
			this.el.trigger('change');

			expect(this.model.get('car')).toContain('saab');
		});

		it('should select multiple DOM elements when the model is set to an array', function() {
			expect(this.el.size() > 0).toBeTruthy();
			expect(this.el.val()).toContain('volvo');

			this.model.set({car: ['saab','audi']});

			var val = this.el.val();
			expect(val).not.toBeNull();
			expect(val).toContain('saab');
			expect(val).toContain('audi');
		});
	
		it('should set the model to an array when multiple options in the DOM are selected', function() {
			expect(this.el.size() > 0).toBeTruthy();
			expect(this.el.val()).toContain('volvo');

			this.el.val(['saab','audi']);
			this.el.trigger('change');

			var val = this.model.get('car');
			expect(val).toContain('saab');
			expect(val).toContain('audi');
		});
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