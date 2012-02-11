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

	xdescribe("the test harness", function() {
		
		it("should add a custom binding handler named 'nop' to the list", function() {
			expect(Backbone.outback.bindingHandlers.nop).toBeDefined();
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

	xdescribe("provide basic debugging tools", function() {
		
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

	describe("does the minimum things which a reasonable person would expect a databinding library to do", function() {
		
		beforeEach(function(){
			this.model = new AModel({ isVisible: false });
			this.view = new TypicalView({model: this.model});
			_.extend(this.view, {
				dataBindings: {
					'#anchor': {
						nop: Backbone.outback.modelRef('isVisible')
					}	
				}
			})
		});

		xdescribe('pays attention to the model', function() {
	
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
			
			xit('should init the binding handlers when the view is rendered', function() {
				spyOn(Backbone.outback.bindingHandlers.nop, 'init').andCallThrough();

				expect(Backbone.outback.bindingHandlers.nop.init).not.toHaveBeenCalled();

				this.view.render();

				expect(Backbone.outback.bindingHandlers.nop.init).toHaveBeenCalled();

				this.view.remove();

				expect(Backbone.outback.bindingHandlers.nop.init.callCount).toBe(1);				
			});

			xit('should notify the binding handlers when the view is rendered', function() {
				spyOn(Backbone.outback.bindingHandlers.nop, 'update').andCallThrough();

				expect(Backbone.outback.bindingHandlers.nop.update).not.toHaveBeenCalled();

				this.view.render();

				expect(Backbone.outback.bindingHandlers.nop.update).toHaveBeenCalled();

				this.view.remove();

				expect(Backbone.outback.bindingHandlers.nop.update.callCount).toBe(1);				
			});

			xit('should notify the binding handlers when the model changes', function() {
				spyOn(Backbone.outback.bindingHandlers.nop, 'update').andCallThrough();

				this.view.render();

				expect(Backbone.outback.bindingHandlers.nop.update).toHaveBeenCalled();

				this.model.set({isVisible: true});

				expect(Backbone.outback.bindingHandlers.nop.update).toHaveBeenCalled();

				this.view.remove();

				expect(Backbone.outback.bindingHandlers.nop.update.callCount).toBe(2);
			});

			it('should remove the binding handlers to when the view is removed', function() {
				spyOn(Backbone.outback.bindingHandlers.nop, 'unbind').andCallThrough();

				expect(Backbone.outback.bindingHandlers.nop.unbind).not.toHaveBeenCalled();

				this.view.render();

				expect(Backbone.outback.bindingHandlers.nop.unbind).not.toHaveBeenCalled();

				this.view.remove();

				expect(Backbone.outback.bindingHandlers.nop.unbind).toHaveBeenCalled();
				expect(Backbone.outback.bindingHandlers.nop.unbind.callCount).toBe(1);				
			});

		});
	});

	xdescribe("provides a way to unobtrustively configure bindings", function() {

		describe("where trivial one-way bindings", function() {

		});

		xdescribe("where two-way bindings", function() {
			
			it('should be tested', function() {

				expect(false).toBeTruthy();

			});
		});
	});
});