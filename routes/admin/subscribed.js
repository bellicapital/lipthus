"use strict";

module.exports = function(req, res, next){
	res.htmlPage
		.init({
			layout: 'moderator',
			view: 'admin/subscribed',
			userLevel: 3
		})
		.then(() => req.app.subscriptor.summary())
		.then(tree => res.locals.tree = tree)
		.then(res.htmlPage.send.bind(res.htmlPage))
		.catch(next);
};
