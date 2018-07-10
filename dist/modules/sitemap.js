"use strict";

const fs = require('fs');
const sitemap = require('express-sitemap');

class SiteMap {
	constructor(site){
		this.site = site;
		this.maps = {};
		this.routes = {};
	}

	add(a, b){
		let routes = a;

		if(typeof a === "string") {
			routes = {};
			routes[a] = b;
		}

		Object.assign(this.routes, routes);
	}

	getSitemap(req){
		const site = this.site;

		if(this.maps[req.ml.lang] && this.maps[req.ml.lang].created > Date.now() - 60000)
			return Promise.resolve(this.maps[req.ml.lang]);

		const d = new Date();
		const sm = sitemap({
			http: site.externalProtocol,
			sitemap: site.dir + '/public/sitemap.xml',
			robots: site.dir + '/public/robots.txt',
			url: req.headers.host
		});

		sm.add = (a, b) => {
			let routes = a;

			if(typeof a === "string") {
				routes = {};
				routes[a] = b;
			}

			Object.each(routes, (route, opt) => {
				sm.map[route] = ['get'];
				sm.my.route[route] = opt;
			});
		};

		sm.add({
			'/': {
				lastmod: d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).substr(-2) + '-' + ('0' + d.getDate()).substr(-2),
				changefreq: 'always',
				priority: 1.0
			}
		});

		sm.add(this.routes);

		Object.values(site.pages).forEach(page => {
			if(page.active && page.sitemap)
				sm.add('/' + page.url, {});
		});

		sm.created = d.getTime();

		this.maps[req.ml.lang] = sm;

		if(!fs.existsSync(site.dir + '/modules/sitemap.js'))
			return Promise.resolve(sm);

		return require(site.dir + '/modules/sitemap')(sm, req);
	}

	middleware(req, res, next){
		this.getSitemap(req)
			.then(sm => {
				if ('/sitemap.xml' === req.url){
					if(fs.existsSync(sm.my.sitemap))
						return res.sendFile(sm.my.sitemap, {maxAge: '2h'});

					return sm.XMLtoWeb(res);
				}

				//robots.txt
				if(fs.existsSync(sm.my.robots))
					return res.sendFile(sm.my.robots, {'Content-Type': 'text/plain', maxAge: '24h'});

				try{
					require(site.dir + '/routes/robots')(req, res, next);
				} catch(e){
					res.set({
						'Cache-Control': 'public, max-age=86400',
						'Content-Type': 'text/plain; charset=utf-8'
					});

					res.send(sm.txt() + "\nSitemap: " + sm.my.url + '/sitemap.xml');
				}
			});
	}
}

module.exports = site => {
	site.sitemap = new SiteMap(site);

	return (req, res, next)=>{
		if ('/robots.txt' !== req.url && '/sitemap.xml' !== req.url)
			return next();

		return site.sitemap.middleware(req, res, next);
	};
};
