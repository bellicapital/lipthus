"use strict";

const w3c = require('../../modules/w3c');

module.exports = (req, res, next)=>{
	const protocol = req.site.externalProtocol;
	const base = protocol + '://' + req.headers.host;

	res.htmlPage
		.init({
			pageTitle: 'W3C validation',
			layout: 'base',
			view: 'admin/w3cv',
			userLevel: 3
		})
		.then(page => page.addJS('admin/w3cv'))
		.then(() => {
			if (req.query.uri) {
				return w3c.get.call({req: req}, req.query.uri, 60)
					.then(result => {
						res.locals.url = result.url;
						res.locals.result = [];
						res.locals.context = result.context;

						result.messages.forEach(r => {
							let obj = {
								type: r.subType || r.type,
								message: r.message
							};

							if (r.firstColumn)
								obj.where = 'Desde la linea ' + (r.firstLine || r.lastLine) + ', columna ' + r.firstColumn + '; hasta la linea ' + r.lastLine + ', columna ' + r.lastColumn;
							else if (r.lastColumn)
								obj.where = 'Linea ' + r.lastLine + ', columna ' + r.lastColumn;

							if (r.extract)
								obj.extract = {
									pre: r.extract.substr(0, r.hiliteStart),
									hilite: r.extract.substr(r.hiliteStart, r.hiliteLength),
									post: r.extract.substr(r.hiliteStart + r.hiliteLength)
								};

							res.locals.result.push(obj);
						});
					});
			} else {
				return req.site.sitemap
					.getSitemap(req)
					.then(sm => Object.keys(sm.map))
					.then(uris => {
						res.locals.uris = {};

						return uris.map(uri=> {
							res.locals.uris[uri] = {enc: encodeURIComponent(uri)};

							return w3c.getCached(base + uri)
								.then(cached=> {
									if (cached)
										res.locals.uris[uri].count = cached.errors;
								});
						});
					})
					.then(Promise.all.bind(Promise))
					.catch(next);
			}
		})
		.then(res.htmlPage.send.bind(res.htmlPage))
		.catch(next);
};
