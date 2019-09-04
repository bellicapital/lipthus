"use strict";

module.exports = function (req, res, next){
	const lang = res.locals.formLang = req.query.lang || req.ml.lang;

	res.htmlPage
		.init({
			view: 'admin/uris',
			title: 'Uri manager',
			layout: 'base',
			userLevel: 3
		})
		.then(p => p.addJS('admin/uris'))
		.then(() => req.db.uri
			.find()
			.sort('uri')
			.select('uri title.' + lang + ' description.' + lang + ' h1.' + lang + ' p.' + lang)
		)
		.then(uris => {
			res.locals.uris = [];

			uris.forEach(uri => {
				const obj = {
					id: uri.id,
					uri: uri.uri
				};

				['title', 'description', 'h1', 'p'].forEach(k => uri[k] && (obj[k] = uri[k][lang]));

				res.locals.uris.push(obj);
			});
		})
		.then(req.ml.availableLangNames.bind(req.ml))
		.then(langNames => res.locals.langNames = langNames)
		.then(() => res.htmlPage.send())
		.catch(next);
};
