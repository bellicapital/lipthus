"use strict";

module.exports = (req, res) => {
	delete req.session.cart;
	req.logout();
	res.redirect('/');
};