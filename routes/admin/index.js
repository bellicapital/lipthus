"use strict";

const fs = require('fs');

module.exports = function(app, router){
	const csrf = app.get('csrf');
	const rdir = app.get('dir') + '/routes/admin/';

	router.all('/admin', require('./admin'));
	
	require('./blogger')(app);

	const pages = [
		'approve-comment', 'bots', 'search-log', 'form-log',
		'email-log', 'translate', 'cert', 'heads', 'w3cv', 'gcm',
		'cache', 'subscribed',
		'files', 'file', 'ws', 'mail-templates', 'notify-subscriptors', 'uris'
	];

	router.get('/bots/:id', require('./bot'));
	router.all('/translate/:lang', require('./translate'));
	router.all('/translate/:lang/:collection', require('./translate'));
	router.all('/translate/:lang/:collection/:itemid', require('./translate'));
	router.get('/form-log/:tag', require('./form-log'));
	router.get('/item-log/:schema/:id', require('./log-item'));
	router.get('/item-log/:schema', require('./log-all'));
	router.get('/item-log', require('./log-all'));

	pages.forEach(function(page){
		// estas rutas tienen que ser eliminadas de sitemap.js
		// app.site.mapExclude.push(page + '*');

		router.all('/' + page + '*', csrf, (req, res, next) => {
			res.htmlPage.userLevel = 2;

			res.htmlPage.checkUserLevel()
				.then(() => {
					const dir = fs.existsSync(rdir + page + '.js') ? rdir : './';

					return require(dir + page)(req, res, next);
				})
				.catch(next);
		});
	});
};