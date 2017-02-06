"use strict";

class Paginator {
	constructor(page, total, url, perPage, maxPages) {
		this.page = page;
		this.total = total;
		this.perPage = perPage || 50;
		this.maxPages = maxPages || 8;
		this.setupUrl(url);
		this.numPages = Math.floor(total / this.perPage) + 1;
		this.first = Math.max(2, page - parseInt(this.maxPages / 2));

		if(this.numPages > this.maxPages && this.first > this.numPages - this.maxPages)
			this.first = this.numPages - this.maxPages;

		this.last = Math.min(this.numPages, this.first + this.maxPages);
	}

	setupUrl(url) {
		this.url = url || '';

		if (!url || url.indexOf('?') === -1)
			this.url += '?';
		else
			this.url += '&';

		this.url += 'page=';
	}

	render(req){
		return new Promise((ok, ko) => {
			req.app.render(req.cmsDir + '/views/paginator', {paginator: this}, (err, html) => {
				err ? ko(err) : ok(html);
			});
		});
	}

	toObject(){
		return {
			page: this.page,
			total: this.total,
			perPage: this.perPage,
			maxPages: this.maxPages,
			numPages: this.numPages,
			first: this.first,
			last: this.last
		}
	}
}

module.exports = Paginator;