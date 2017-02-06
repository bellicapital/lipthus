"use strict";

const ObjectId = require('mongoose').Types.ObjectId;

module.exports = function(req, res, next){
	const query = ObjectId.isValid(req.params.uid) ? {_id: ObjectId(req.params.uid)} : {uname: req.params.uid};

	req.db.user
		.findOne(query)
		.then(user => user ? res.htmlPage.setItem(user) : Promise.reject())
		.then(() => req.ml.load("ecms-user"))
		.then(() => res.htmlPage
			.init({
				jQueryMobile: true,
				pageTitle: req.site.config.sitename + ' -> users -> ' + res.locals.item.getName(),
				layout: 'base',
				view: 'user',
				userLevel: 1
			})
		)
		.then(p => p.addCSS('user').send())
		.catch(next);
};