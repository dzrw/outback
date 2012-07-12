describe('the options binding', function() {

	describe('should use a selector to find option and optgroup elements for a select control', function() {

		beforeEach(function() {
			this.model = new AModel({transport: 'boat'});
			this.viewModel = new AModel({transportOptions: '#transportOptions'});
			this.view = new FixtureView({model: this.model});
			_.extend(this.view, {
				viewModel: this.viewModel,
				innerHtml: 
				"<select data-bind='value: @transport' data-bind-view='options: @transportOptions'></select>\
				<script type='text/template' id='transportOptions'>\
					<option value='car'>Car</option>\
					<option value='boat'>Boat</option>\
					<option value='train'>Train</option>\
				</script>"
			});

			this.view.render();
			this.el = this.view.$('#anchor select');				
		});

		afterEach(function() {
			this.view.remove();
		});

		it('should add options to the select control', function() {
			expect(this.el.find('option').size()).toBe(3);
		});

		it('should set the correct initial value', function() {
			expect(this.el.val()).toBe('boat');

			var boat = this.el.find('option[value=boat]');

			expect(boat.size() > 0).toBeTruthy();
			expect(boat.is(':selected')).toBeTruthy();
		});
	});

});