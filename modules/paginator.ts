export default class Paginator {

	public numPages: number;
	public first: number;
	public last: number;

	constructor(public page: number, public total: number, public url = '', public perPage = 50, public maxPages = 8) {
		this.setupUrl(url);
		this.numPages = Math.floor(total / this.perPage) + 1;
		this.first = Math.max(2, page - (this.maxPages / 2));

		if (this.numPages > this.maxPages && this.first > this.numPages - this.maxPages)
			this.first = this.numPages - this.maxPages;

		this.last = Math.min(this.numPages, this.first + this.maxPages);
	}

	setupUrl(url: string) {
		this.url = url || '';

		if (!url || url.indexOf('?') === -1)
			this.url += '?';
		else
			this.url += '&';

		this.url += 'page=';
	}

	render(req: any) {
		return new Promise((ok, ko) => {
			req.app.render(req.lipthusDir + '/views/paginator', {paginator: this}, (err: Error, html: string) =>
				err ? ko(err) : ok(html)
			);
		});
	}

	toObject() {
		return {
			page: this.page,
			total: this.total,
			perPage: this.perPage,
			maxPages: this.maxPages,
			numPages: this.numPages,
			first: this.first,
			last: this.last
		};
	}
}
