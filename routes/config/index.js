"use strict";

const Router = require('express').Router;

module.exports = app => {
	const router = Router({strict: true});

	router.use((req, res, next) => {
		res.htmlPage.layout = 'config';

		res.htmlPage.checkUserLevel(2)
			.then(() => next(), next);
	});

	router.get('/', require('./menu'));
	router.get('/cart', require('./cart'));

	app.use('/config', router);
};