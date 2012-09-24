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

	describe('should interpret an Object as a container of values and labels', function () {

		beforeEach(function() {
			this.model = new AModel({
				transport: 'boat'
			});
			this.viewModel = new AModel({
				transportOptions: {
					'car': {label: 'Car'},
					'boat': {label: 'Boat'},
					'train': {label: 'Train'}
				}
			});
			this.view = new FixtureView({model: this.model});
			_.extend(this.view, {
				viewModel: this.viewModel,
				innerHtml: 
				"<select data-bind='value: @transport' data-bind-view='options: @transportOptions'></select>"
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

		it('should set the labels correctly', function() {
			expect(this.el.val()).toBe('boat');

			var pairs = _.map(this.el.find('option'), function (x) { 
				var y = {};
				y[$(x).attr('value')] = $(x).text();
				return y; 
			});

			var b = _.every(this.viewModel.transportOptions, function (v, k) {
				return !_.isUndefined(pairs[k]) && pairs[k] === v;
			});

			expect(b).toBeTruthy();
		});		
	});

});