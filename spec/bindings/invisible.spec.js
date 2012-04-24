describe('the invisible binding', function () {

	it('should toggle the visibility of the bound element', function() {

		this.model = new AModel({isHidden: true});
		this.view = new FixtureView({model: this.model});
		_.extend(this.view, {
			modelBindings: {
				'#anchor': {
					invisible: Backbone.outback.modelRef('isHidden')
				}	
			}
		})

		this.view.render();
		this.el = this.view.$('#anchor');

		expect(this.el.is(":visible")).toBeFalsy();

		this.model.set({isHidden: false});
		expect(this.el.is(":visible")).toBeTruthy();

		this.model.set({isHidden: 'a string'});
		expect(this.el.is(":visible")).toBeFalsy();

		this.view.remove();
	});

});