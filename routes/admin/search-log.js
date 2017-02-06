"use strict";

module.exports = function (req, res, next){
	res.htmlPage
		.init('admin/search-log')
		.then(() => req.db.search.find().sort({created: -1}))
		.then(r => res.locals.searches = r)
		.then(res.htmlPage.send.bind(res.htmlPage))
		.catch(next);
};