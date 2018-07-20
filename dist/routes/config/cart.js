"use strict";

module.exports = (req, res, next) => {
	res.locals.cart = req.site.config.cart;

	res.htmlPage
		.init({
			jQueryMobile: true,
			title: 'Shopping Cart',
			layout: 'config'
		})
		.then(p => p.send('config/cart'))
		.catch(next);
};