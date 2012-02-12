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

	describe('comes standard with a vast array of working bindings', function() {
		
		describe('the visible binding', function () {

			it('should toggle the visibility of the bound element', function() {

				this.model = new AModel({isVisible: true});
				this.view = new FixtureView({model: this.model});
				_.extend(this.view, {
					dataBindings: {
						'#anchor': {
							visible: Backbone.outback.modelRef('isVisible')
						}	
					}
				})

				this.view.render();
				this.el = this.view.$('#anchor');

				expect(this.el.is(":visible")).toBeTruthy();

				this.model.set({isVisible: false});
				expect(this.el.is(":visible")).toBeFalsy();

				this.model.set({isVisible: 'a string'});
				expect(this.el.is(":visible")).toBeTruthy();

				this.view.remove();
			});

		});

		describe('the text binding', function() {

			beforeEach(function() {
				this.model = new AModel({firstName: 'Abram'});
				this.view = new FixtureView({model: this.model});
				_.extend(this.view, {
					innerHtml: "<span data-bind='text: @firstName'></span>"
				})

				this.view.render();
				this.el = this.view.$('#anchor span');				
			});

			afterEach(function() {
				this.view.remove();
			})

			it('should update the value of the DOM element when the model changes', function() {
				expect(this.el.size() > 0).toBeTruthy();
				expect(this.el.text()).toBe('Abram');

				this.model.set({firstName: 'Abraham'});

				expect(this.el.text()).toBe('Abraham');
			});

		});

		describe('the html binding', function() {

			beforeEach(function() {
				this.model = new AModel({content: '<p>Hello, world!</p>'});
				this.view = new FixtureView({model: this.model});
				_.extend(this.view, {
					innerHtml: "<span data-bind='html: @content'></span>"
				})

				this.view.render();
				this.el = this.view.$('#anchor span');				
			});

			afterEach(function() {
				this.view.remove();
			})

			it('should update the value of the DOM element when the model changes', function() {
				expect(this.el.size() > 0).toBeTruthy();
				expect(this.el.html()).toBe('<p>Hello, world!</p>');

				this.model.set({content: '<span>A fine span.</span>'});

				expect(this.el.html()).toBe('<span>A fine span.</span>');
			});

		});
		
		describe('the css binding', function() {

			beforeEach(function() {
				this.model = new AModel({isActive: false, isCool: true});
				this.view = new FixtureView({model: this.model});
				_.extend(this.view, {
					innerHtml: "<span data-bind='css: { active: @isActive, cool: @isCool }'></span>"
				})

				this.view.render();
				this.el = this.view.$('#anchor span');				
			});

			afterEach(function() {
				this.view.remove();
			})

			it('should update the value of the DOM element when the model changes', function() {
				expect(this.el.hasClass('active')).toBeFalsy();
				expect(this.el.hasClass('cool')).toBeTruthy();

				this.model.set({isActive: true, isCool: false});

				expect(this.el.hasClass('active')).toBeTruthy();
				expect(this.el.hasClass('cool')).toBeFalsy();
			});

		});

		describe('the attr binding', function() {

			beforeEach(function() {
				this.model = new AModel({url: 'year-end.html', title: 'Report including final year-end statistics'});
				this.view = new FixtureView({model: this.model});
				_.extend(this.view, {
					innerHtml: "<a data-bind='attr: { href: @url, title: @title }'></a>"
				})

				this.view.render();
				this.el = this.view.$('#anchor a');
			});

			afterEach(function() {
				this.view.remove();
			})

			it('should update the value of the DOM element when the model changes', function() {
				expect(this.el.attr('href')).toBe('year-end.html');
				expect(this.el.attr('title')).toBe('Report including final year-end statistics');

				this.model.set({url: 'http://news.ycombinator.com/', title: 'Where you normally end up anyway'});

				var escapedUrl = 'http:&#x2F;&#x2F;news.ycombinator.com&#x2F;'
				expect(this.el.attr('href')).toBe(escapedUrl);
				expect(this.el.attr('title')).toBe('Where you normally end up anyway');
			});

			it('should remove attributes which are set to empty values', function() {
				this.model.set({url: null, title: ''});

				expect(this.el.attr('href')).toBeUndefined();
				expect(this.el.attr('title')).toBeUndefined();

				this.model.set({url: 'a', title: 'b'});

				expect(this.el.attr('href')).toBeDefined();
				expect(this.el.attr('title')).toBeDefined();

				this.model.set({url: '', title: []});

				expect(this.el.attr('href')).toBeUndefined();
				expect(this.el.attr('title')).toBeUndefined();
			});

		});
		
		describe('the enable binding', function() {

			beforeEach(function() {
				this.model = new AModel({hasCellphone: false});
				this.view = new FixtureView({model: this.model});
				_.extend(this.view, {
					innerHtml: "<input type='text' data-bind='enable: @hasCellphone'>"
				})

				this.view.render();
				this.el = this.view.$('#anchor input');				
			});

			afterEach(function() {
				this.view.remove();
			})

			it('should update the value of the DOM element when the model changes', function() {
				expect(this.el.is(":enabled")).toBeFalsy();

				this.model.set({hasCellphone: true});

				expect(this.el.is(":enabled")).toBeTruthy();
			});

		});
		
		describe('the disable binding', function() {

			beforeEach(function() {
				this.model = new AModel({disabled: false});
				this.view = new FixtureView({model: this.model});
				_.extend(this.view, {
					innerHtml: "<input type='text' data-bind='disable: @disabled'>"
				})

				this.view.render();
				this.el = this.view.$('#anchor input');				
			});

			afterEach(function() {
				this.view.remove();
			})

			it('should update the value of the DOM element when the model changes', function() {
				expect(this.el.is(":disabled")).toBeFalsy();

				this.model.set({disabled: true});

				expect(this.el.is(":disabled")).toBeTruthy();
			});

		});

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
		});

		describe('the hasfocus binding', function() {

			beforeEach(function() {
				this.model = new AModel({isSelected: false});
				this.view = new FixtureView({model: this.model});
				_.extend(this.view, {
					innerHtml: "\
					<input data-bind='hasfocus: @isSelected' /> \
					<span data-bind='visible: @isSelected'>The input box has focus.</span>"
				})

				this.view.render();
				this.el = this.view.$('#anchor input');				
			});

			afterEach(function() {
				this.view.remove();
			})

			it('should initialize into a stable state', function() {
				expect(this.model.get('isSelected')).toBe(false);
				expect(this.el.is(":focus")).toBeFalsy();
			});

			it('should update the focus of the DOM element when the model changes', function() {
				runs(function() { 
					this.model.set({isSelected: true});
				});

				waitsFor(function() {
					return this.el.is(":focus");
				}, "the element to receive focus.", 1000);

				runs(function() { 
					this.model.set({isSelected: false});
				});

				waitsFor(function() {
					return !this.el.is(":focus");
				}, "the element to lose focus.", 1000);
			});
			
			it('should update the model when the focus of the DOM element changes', function() {

				runs(function() { 
					this.el.focus(); 
				});

				waitsFor(function() {
					return this.model.get('isSelected') === true
				}, "the model attribute to be set to true.", 1000);

				runs(function() { 
					this.el.blur(); 
				});

				waitsFor(function() {
					return this.model.get('isSelected') === false
				}, "the model attribute to be set to false.", 1000);
			});
		});		

	});

	describe('helps prevent XSS attacks', function() {
		var xssPayload = "<script>(function() { var xss = 'in ur page, hackin ur users'; })();</script>";
		var xssPayloadEscaped = '&lt;script&gt;(function() { var xss = &#x27;in ur page, hackin ur users&#x27;; })();&lt;&#x2F;script&gt;'

		beforeEach(function() {
			this.addMatchers({
				toBeSafe: function(selector, methodName) {
					var view, $el, content;

					view = this.actual;

					view.render();
					$el = view.$(selector);
					content = $el[methodName]();

					return content === xssPayloadEscaped;
				},

				toBeExploited: function(selector, methodName) {
					var view, $el, content;

					view = this.actual;
					view.dataBindings[selector].escape = false;

					view.render();
					$el = view.$(selector);
					content = $el[methodName]();
					
					return content === xssPayload;
				}
			});

			this.model = new AModel({content: xssPayload});
			this.view = new FixtureView({model: this.model});
		});

		afterEach(function() {
			this.view.remove();
		});

		describe('the value binding', function() {
			beforeEach(function() {
				_.extend(this.view, {
					innerHtml: "<input type='text'>",
					dataBindings: {
						'#anchor input': {
							value: Backbone.outback.modelRef('content')
						}
					}
				});
			});
			
			it('should escape values from the model by default', function () {
				expect(this.view).toBeSafe('#anchor input', 'val');
			});

			it('should allow you to shoot yourself in the foot', function () {
				expect(this.view).toBeExploited('#anchor input', 'val');
			});
		});

		describe('the text binding', function() {
			beforeEach(function() {
				_.extend(this.view, {
					innerHtml: "<p></p>",
					dataBindings: {
						'#anchor p': {
							text: Backbone.outback.modelRef('content')
						}
					}
				});
			});
			
			it('should escape values from the model by default', function () {
				expect(this.view).toBeSafe('#anchor p', 'text');
			});

			it('should allow you to shoot yourself in the foot', function () {
				expect(this.view).toBeExploited('#anchor p', 'text');
			});
		});
	});
});



		
