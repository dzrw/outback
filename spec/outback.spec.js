describe('outback.js declarative bindings for backbone.js', function() {

	describe("are an extension", function() {

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

	describe("the test harness", function() {
		
		it("should add a custom binding handler named 'nop' to the list", function() {
			expect(Backbone.outback.bindingHandlers.nop).toBeDefined();
		});

	});

	describe("are safe to drop into an existing view", function() {
		
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
			expect(args[0].executableBindingsSkipped).toBe(0);
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
			expect(args[0].executableBindingsSkipped).toBe(0);
			expect(args[0].executableBindingsInstalled).toBe(0);

			this.view.remove();
		});

	});

	describe("does the minimum things which a reasonable person would expect a databinding library to do", function() {
		
		beforeEach(function(){
			this.model = new AModel({ isVisible: false });
			this.view = new TypicalView({model: this.model});
			_.extend(this.view, {
				modelBindings: {
					'#anchor': {
						nop: Backbone.outback.modelRef('isVisible')
					}	
				}
			})
		});

		describe('pays attention to the model', function() {
	
			it('should subscribe to changes in the model when the view is rendered', function() {
				var args, modelEvents;

				this.view.previewBinding = function(binding) {
					spyOn(binding.modelEvents, 'subscribe').andCallThrough();
					modelEvents = binding.modelEvents;
					return true;
				};

				this.view.render();

				expect(modelEvents.subscribe).toHaveBeenCalled();

				this.view.remove();	
			});

			it('should unsubscribe from changes in the model when the view is removed', function() {
				var args, modelEvents;

				this.view.previewBinding = function(binding) {
					spyOn(binding.modelEvents, 'unsubscribe').andCallThrough();
					modelEvents = binding.modelEvents;
					return true;
				};

				this.view.render();

				expect(modelEvents.unsubscribe).not.toHaveBeenCalled();

				this.view.remove();	
				
				expect(modelEvents.unsubscribe).toHaveBeenCalled();
			});

		});

		describe('lets the DOM get in on the action', function() {
			
			it('should init the binding handlers when the view is rendered', function() {
				spyOn(Backbone.outback.bindingHandlers.nop, 'init').andCallThrough();

				expect(Backbone.outback.bindingHandlers.nop.init).not.toHaveBeenCalled();

				this.view.render();

				expect(Backbone.outback.bindingHandlers.nop.init).toHaveBeenCalled();

				this.view.remove();

				expect(Backbone.outback.bindingHandlers.nop.init.callCount).toBe(1);				
			});

			it('should notify the binding handlers when the view is rendered', function() {
				spyOn(Backbone.outback.bindingHandlers.nop, 'update').andCallThrough();

				expect(Backbone.outback.bindingHandlers.nop.update).not.toHaveBeenCalled();

				this.view.render();

				expect(Backbone.outback.bindingHandlers.nop.update.callCount).toBe(1);

				this.view.remove();

				expect(Backbone.outback.bindingHandlers.nop.update.callCount).toBe(1);
			});

			it('should notify the binding handlers when the model changes', function() {
				spyOn(Backbone.outback.bindingHandlers.nop, 'update').andCallThrough();

				this.view.render();

				expect(Backbone.outback.bindingHandlers.nop.update.callCount).toBe(1);

				this.model.set({isVisible: true});

				expect(Backbone.outback.bindingHandlers.nop.update.callCount).toBe(2);

				this.view.remove();

				expect(Backbone.outback.bindingHandlers.nop.update.callCount).toBe(2);
			});

			it('should remove the binding handlers to when the view is removed', function() {
				spyOn(Backbone.outback.bindingHandlers.nop, 'remove').andCallThrough();

				expect(Backbone.outback.bindingHandlers.nop.remove).not.toHaveBeenCalled();

				this.view.render();

				expect(Backbone.outback.bindingHandlers.nop.remove).not.toHaveBeenCalled();

				this.view.remove();

				expect(Backbone.outback.bindingHandlers.nop.remove).toHaveBeenCalled();
				expect(Backbone.outback.bindingHandlers.nop.remove.callCount).toBe(1);				
			});

			it('should no longer respond to model changes after the view is removed', function() {
				spyOn(Backbone.outback.bindingHandlers.nop, 'update').andCallThrough();

				this.view.render();
				this.view.remove();

				expect(Backbone.outback.bindingHandlers.nop.update.callCount).toBe(1);				

				this.model.set({isVisible: true});

				expect(Backbone.outback.bindingHandlers.nop.update.callCount).toBe(1);				
			});
		});
	});

	describe("supports Knockout-inspired data-bind attributes", function() {
		
		beforeEach(function(){
			this.model = new AModel({ isVisible: false });
			this.view = new KnockoutView({model: this.model});
		});
		
		it("should still pay attention to the model", function() {
			var args, modelEvents;

			this.view.previewBinding = function(binding) {
				spyOn(binding.modelEvents, 'subscribe').andCallThrough();
				spyOn(binding.modelEvents, 'unsubscribe').andCallThrough();
				modelEvents = binding.modelEvents;
				return true;
			};

			this.view.render();

			expect(modelEvents.subscribe).toHaveBeenCalled();
			expect(modelEvents.unsubscribe).not.toHaveBeenCalled();

			this.view.remove();	

			expect(modelEvents.subscribe.callCount).toBe(1);
			expect(modelEvents.unsubscribe.callCount).toBe(1);
		});

		it("should still let the DOM get in on the action", function() {
			spyOn(Backbone.outback.bindingHandlers.nop, 'init').andCallThrough();
			spyOn(Backbone.outback.bindingHandlers.nop, 'update').andCallThrough();
			spyOn(Backbone.outback.bindingHandlers.nop, 'remove').andCallThrough();

			expect(Backbone.outback.bindingHandlers.nop.init).not.toHaveBeenCalled();
			expect(Backbone.outback.bindingHandlers.nop.update).not.toHaveBeenCalled();
			expect(Backbone.outback.bindingHandlers.nop.remove).not.toHaveBeenCalled();

			this.view.render();

			expect(Backbone.outback.bindingHandlers.nop.init).toHaveBeenCalled();
			expect(Backbone.outback.bindingHandlers.nop.update.callCount).toBe(1);
			expect(Backbone.outback.bindingHandlers.nop.remove).not.toHaveBeenCalled();

			this.model.set({isVisible: true});

			expect(Backbone.outback.bindingHandlers.nop.update.callCount).toBe(2);

			this.view.remove();

			expect(Backbone.outback.bindingHandlers.nop.init.callCount).toBe(1);				
			expect(Backbone.outback.bindingHandlers.nop.update.callCount).toBe(2);
			expect(Backbone.outback.bindingHandlers.nop.remove.callCount).toBe(1);				
		});
	});

	describe("supports multiple bindings contexts", function() {

		beforeEach(function(){
			this.model = new Backbone.Model({x: false});
			this.viewModel = new Backbone.Model({y: 'value from viewmodel'});

			this.view = new FixtureView({model: this.model});
			
			_.extend(this.view, {
				viewModel: this.viewModel,
				innerHtml: "<input type='text' data-bind='css: { xclass: @x }' data-bind-view='value: @y'>"
			});
		});
		
		it('should initialize into a stable state', function() {
			var args, bindings;

			this.view.bindingSummary = function() {};

			spyOn(this.view, 'bindingSummary');

			this.view.render();
			this.el = this.view.$('#anchor input');

			args = this.view.bindingSummary.mostRecentCall.args;
			expect(args[0].executableBindingsSkipped).toBe(0);
			expect(args[0].executableBindingsInstalled).toBe(2);

			expect(this.model.get('x')).toBeFalsy();
			expect(this.el.hasClass('xclass')).toBeFalsy();

			expect(this.viewModel.get('y')).toBe('value from viewmodel');
			expect(this.el.val()).toBe('value from viewmodel');

			this.view.remove();
		});
			
		it("should correctly handle the optional viewModel binding context", function() {
			spyOn(Backbone.outback.bindingHandlers.value, 'update').andCallThrough();

			this.view.render();
			this.el = this.view.$('#anchor input');

			expect(Backbone.outback.bindingHandlers.value.update.callCount).toBe(1);

			this.viewModel.set({y: 'hello, world'});

			expect(Backbone.outback.bindingHandlers.value.update.callCount).toBe(2);

			expect(this.el.val()).toBe('hello, world');

			this.el.val('binding contexts rock');
			this.el.trigger('change');

			expect(this.viewModel.get("y")).toBe('binding contexts rock');

			this.view.remove();
		});

	});
});
