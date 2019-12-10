"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Paginator {
    constructor(page, total, url = '', perPage = 50, maxPages = 8) {
        this.page = page;
        this.total = total;
        this.url = url;
        this.perPage = perPage;
        this.maxPages = maxPages;
        this.setupUrl(url);
        this.numPages = Math.floor(total / this.perPage) + 1;
        this.first = Math.max(2, page - (this.maxPages / 2));
        if (this.numPages > this.maxPages && this.first > this.numPages - this.maxPages)
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
    render(req) {
        return new Promise((ok, ko) => {
            req.app.render(req.lipthusDir + '/views/paginator', { paginator: this }, (err, html) => err ? ko(err) : ok(html));
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
exports.default = Paginator;
