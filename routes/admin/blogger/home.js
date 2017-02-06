"use strict";

module.exports = (req, res, next) => {
	const blogger = req.app.getModule('blogger')(req);

	if(req.query.reflink)
		req.session.bloggerreflink = req.query.reflink;

	if(blogger.size === 1)
		return res.redirect('/blogger/' + blogger.keys[0]);

	res.htmlPage
		.init({
			jQueryMobile: true,
			jQueryMobileTheme: 'default',
			jQueryUI: true,
			title: 'Blogger',
			sitelogo: true,
			view: 'admin/blogger/home',
			layout: 'base',
			userLevel: 2,
			userType: 'blogger'
		})
		.then(() => {
			res.locals.reflink = req.session.bloggerreflink || "/";

			if (!blogger.size)
				res.htmlPage.send();

			blogger.getBlogs({}, function (err, blogs) {
				if (err)
					return next(err);

				res.locals.blogs = blogs;
				res.htmlPage.send();
			});
		})
		.catch(next);
};