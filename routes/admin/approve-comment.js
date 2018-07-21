"use strict";

const url = require('url');

module.exports = function comment(req, res, next){
	const page = res.htmlPage;

	req.db.comment
		.findById(req.query.id)
		.then(comment => {
			if(!comment)
				return next();

			return page.init({
					userLevel: comment.getHash() === req.param('hash') ? 0 : 2,
					title: 'Approve comment',
					sitelogo: true,
					view: 'admin/approve-comment',
					layout: 'admin',
					userNav: true
				})
				.then(page => page.head
					.addJS('/cms/js/approve-comment.js')
					.addCSS('/cms/css/layout-mobile.css')
				)
				.then(() => comment.getItem())
				.then(item => {
					if(!item)
						return next();

					const d = comment.created;

					comment.date = d.getDate() + '-' + (d.getMonth() + 1) + '-' + d.getFullYear() + ' ' + d.toLocaleTimeString();

					res.locals.item = {title: item.title, url: comment.url ? url.parse(comment.url).path : ''};
					res.locals.comment = comment;

					return page.send();
				});
		})
		.catch(next);
};
