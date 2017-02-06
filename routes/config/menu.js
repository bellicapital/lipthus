"use strict";

module.exports = (req, res, next) => {
	res.htmlPage
		.init({
			jQueryMobile: true,
			title: 'Config',
			layout: 'config'
		})
		.then(p => p.send('config/menu'))
		.catch(next);
};