"use strict";

const fs = require('mz/fs');
const os = require('os');
const md5 = require('md5');
const debug = require('debug')('site:heads');
const urlContent = require('../../modules/util').urlContent;
const tmpdir = os.tmpdir() + '/heads/';

fs.mkdir(tmpdir).catch(err => {
	if(err.code !== 'EEXIST')
		throw err;
});

module.exports = (req, res, next)=>{
	if(req.query.uri){
		return getHeads(req.site.externalProtocol + ':' + req.site.langUrl(req.query.lang) + req.query.uri)
			.then(res.json.bind(res));
	}

	res.locals.formLang = req.query.lang || req.site.config.language;

	res.htmlPage
		.init({
			jQueryMobile: true,
			pageTitle: 'Head things',
			layout: 'base',
			view: 'admin/heads',
			userLevel: 2
		})
		.then(() => req.site.sitemap.getSitemap(req))
		.then(sm => res.locals.uris = Object.keys(sm.map))
		.then(() => req.ml.availableLangNames())
		.then(langNames => res.locals.langNames = langNames)
		.then(() => res.htmlPage.addJS('admin/heads').send())
		.catch(next);
};

const titleRe = /<title>(.+)<\/title>/;
const descRe = /<meta name="description" content="([^"]+)">/;

const getHeads = uri => {
	const file = tmpdir + md5(uri);

	return getCached(file)
		.then(cached => {
			if(cached && (cached.time > Date.now() - 600 * 1000))//10 min
				return cached;

			return urlContent(uri)
				.then(str => {
					const t = str.match(titleRe);
					const d = str.match(descRe);

					return {
						title: t && t[1],
						description: d && d[1],
						time: Date.now()
					}
				})
				.then(json => {
					return fs.writeFile(file, JSON.stringify(json))
						.then(() => {
							debug('file written');

							return json;
						});
				});
		});
};

const getCached = file => {
	return fs.access(file)
		.then(() => {
			return fs.readFile(file, 'utf8')
				.then(r => JSON.parse(r))
		}, () => false);// no devolvemos el error porque no esté cacheado
};
