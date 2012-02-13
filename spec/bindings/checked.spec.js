describe('the checked binding', function() {

	describe('when applied to checkboxes', function () {
		
		beforeEach(function() {
			this.model = new AModel({isSelected: false});
			this.view = new FixtureView({model: this.model});
			_.extend(this.view, {
				innerHtml: "<input type='checkbox' data-bind='checked: @isSelected' />"
			})

			this.view.render();
			this.el = this.view.$('#anchor input');				
		});

		afterEach(function() {
			this.view.remove();
		})

		it('should initialize into a stable state', function() {
			expect(this.model.get('isSelected')).toBe(false);
			expect(this.el.is(":checked")).toBeFalsy();
		});

		it('should update the state of the DOM element when the model changes', function() {
			runs(function() { 
				this.model.set({isSelected: true});
			});

			waitsFor(function() {
				return this.el.is(":checked");
			}, "the element to be checked.", 1000);

			runs(function() { 
				this.model.set({isSelected: false});
			});

			waitsFor(function() {
				return !this.el.is(":checked");
			}, "the element to be unchecked.", 1000);
		});				

		it('should update the model when the state of the DOM element changes', function() {

			runs(function() { 
				this.el.click(); 
			});

			waitsFor(function() {
				return this.model.get('isSelected') === true
			}, "the model attribute to be set to true.", 1000);

			runs(function() { 
				this.el.click(); 
			});

			waitsFor(function() {
				return this.model.get('isSelected') === false
			}, "the model attribute to be set to false.", 1000);
		});
	});

	describe('when applied to radio buttons', function () {
		
		beforeEach(function() {
			this.model = new AModel({color: ''});
			this.view = new FixtureView({model: this.model});
			_.extend(this.view, {
				innerHtml: "<div>\
				<input id='r' type='radio' name='group1' value='red' data-bind='checked: @color' />\
				<input id='g' type='radio' name='group1' value='green' data-bind='checked: @color' />\
				<input id='b' type='radio' name='group1' value='blue' data-bind='checked: @color' />\
				</div>"
			})

			this.view.render();
			this.el = this.view.$('#anchor input');				
		});

		afterEach(function() {
			this.view.remove();
		})

		it('should initialize into a stable state', function() {
			var $r, $g, $b, $group;
			$group = $('#anchor input[name=group1]');

			expect(this.model.get('color')).toBe('');
			expect($group.find(":checked").length).toBe(0);
		});

		it('should check the matching radio button when the model changes', function () {
			var $r, $g, $b, $group;
			$group = $('#anchor input[name=group1]');
			$r = $('#r');
			$g = $('#g');
			$b = $('#b');

			runs(function() { 
				this.model.set({color: 'green'});
			});

			waitsFor(function() {
				return $g.is(":checked");
			}, "the green radio button to be checked.", 1000);

			runs(function () {
				expect($r.is(":checked")).toBeFalsy();
				expect($b.is(":checked")).toBeFalsy();

				this.model.set({color: 'blue'});
			});

			waitsFor(function() {
				return $b.is(":checked");
			}, "the blue radio button to be checked.", 1000);

			runs(function () {
				expect($r.is(":checked")).toBeFalsy();
				expect($g.is(":checked")).toBeFalsy();

				this.model.set({color: ''});
			});

			waitsFor(function() {
				return $group.find(":checked").length === 0;
			}, "all radio buttons to be unchecked.", 1000);
		});

		it('should update the model when the state of the DOM element changes', function() {
			var $r, $g, $b;
			$r = $('#r');
			$g = $('#g');
			$b = $('#b');

			runs(function() { 
				$r.click(); 
			});

			waitsFor(function() {
				return this.model.get('color') === 'red'
			}, "the model attribute to be set to red.", 1000);

			runs(function() { 
				$g.click(); 
			});

			waitsFor(function() {
				return this.model.get('color') === 'green'
			}, "the model attribute to be set to green.", 1000);
		});
	});
});	