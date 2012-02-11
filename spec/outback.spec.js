describe('outback.js declarative bindings for backbone.js', function() {

	xdescribe("are an extension", function() {

		it("should have a few dependencies", function() {
			expect($).toBeDefined();			
			expect(_).toBeDefined();			
			expect(Backbone).toBeDefined();			
			expect(rj).toBeDefined();			
		});

		it("should be defined in the Backbone namespace", function () {
			expect(Backbone.outback).toBeDefined();			
		});

	});

	xdescribe("are safe to drop into an existing view", function() {
		
		beforeEach(function(){
			this.model = new AModel({
				villain: "mrMonster",
				doctor: "Seuss",
				pet: "cat",
				isValid: true
			});
		});

		it("should work on views without any bindings", function() {
			this.view = new TypicalView({model: this.model});
			this.view.render();
			this.el = this.view.$("#anchor");
			expect(this.el.size()).toBe(1);
			this.view.remove();	
		});

	});

	describe("provide basic debugging tools", function() {
		
		beforeEach(function(){
			this.model = new AModel({isVisible: false});
			this.view = new UnobtrusiveView({model: this.model});
		});

		afterEach(function() {
			this.view.remove();
		})

		it("should be possible to obtain a data binding summary", function() {
			var args;

			this.view.bindingSummary = function() {};

			spyOn(this.view, 'bindingSummary');

			this.view.render();

			expect(this.view.bindingSummary).toHaveBeenCalled();
			
			args = this.view.bindingSummary.mostRecentCall.args;
			expect(args).toBeDefined();
			expect(args.length).toBe(1);
			expect(args[0].executableBindingsInstalled).toBe(1);
		});

		it("should be possible to filter bindings", function() {
			var args;

			this.view.previewBinding = function() {};
			this.view.bindingSummary = function() {};

			spyOn(this.view, 'previewBinding').andReturn(false);
			spyOn(this.view, 'bindingSummary');

			this.view.render();

			expect(this.view.previewBinding).toHaveBeenCalled();
			expect(this.view.bindingSummary).toHaveBeenCalled();
			
			args = this.view.bindingSummary.mostRecentCall.args;
			expect(args).toBeDefined();
			expect(args.length).toBe(1);
			expect(args[0].executableBindingsInstalled).toBe(0);

			this.view.remove();
		});

	});

	xdescribe("provides a way to unobtrustively configure bindings", function() {

		describe("where trivial one-way bindings", function() {

			beforeEach(function(){
				this.model = new AModel({
					isVisible: false
				});

				this.view = new TypicalView({model: this.model});

				// unobtrusive binding declarations
				this.view.dataBindings = {
					visible: Backbone.outback.modelRef('isVisible')			
				};

				this.view.render();
				this.el = this.view.$("#anchor");
			});

			afterEach(function() {
				this.view.remove();	
			});

			it('should be initialized properly', function() {
				expect(this.el.size()).toBe(1);
				expect(this.el.is(":visible")).toBeFalsy();
			});

			it('should respond to changes in the model', function() {
				spyOn(this.model)
				var spy = jasmine.createSpy("-change event spy-");

				this.model.set({isValid: true});
				expect(this.el.is(":visible")).toBeTruthy();

				this.model.set({isValid: false});
				expect(this.el.is(":visible")).toBeFalsy();
			});
		});

		xdescribe("where two-way bindings", function() {
			
			it('should be tested', function() {

				expect(false).toBeTruthy();

			});
		});
	});
});