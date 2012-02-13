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