"use strict";

module.exports = (req, res, next) => {
	delete req.session.cart;
	delete req.session.redirect_to;
	req.logout();
	res.redirect('/');
};