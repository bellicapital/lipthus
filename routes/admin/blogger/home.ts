import {NextFunction} from "express";
import {Blogger} from "../../../modules/blogger";

export function bloggerHome(req: any, res: any, next: NextFunction) {
	const blogger = new Blogger(req);
	
	if (req.query.reflink)
		req.session.bloggerreflink = req.query.reflink;
	
	if (blogger.size === 1)
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
			
			blogger.getBlogs({}, (err: Error, blogs: Array<any>) => {
				if (err)
					return next(err);
				
				res.locals.blogs = blogs;
				res.htmlPage.send();
			});
		})
		.catch(next);
}
