import {NextFunction} from "express";
import {Blogger} from "../../../modules/blogger";

// Listado de posts de un blog
export function bloggerList(req: any, res: any, next: NextFunction) {
	const blogger = new Blogger(req);
	const schema = req.params.schema;
	const blog = blogger.getBlog(schema);
	
	if (!blog)	// page not found
		return next();
	
	res.locals.blogTitle = blog.title;
	res.locals.schema = req.params.schema;
	res.locals.reflink = blogger.size === 1 ? req.session.bloggerreflink || "/" : "/blogger";
	
	res.htmlPage
		.init({
			jQueryMobile: true,
			jQueryMobileTheme: 'default',
			jQueryUI: true,
			title: 'Blogger',
			sitelogo: true,
			view: 'admin/blogger/list',
			layout: 'base',
			userLevel: 2,
			userType: 'blogger'
		})
		.then(() => req.db.model(schema)
			.find()
			.select({active: 1, image: 1, created: 1, description: 1, title: 1, url: 1})
			.sort({created: -1})
		)
		.then((r: Array<any>) => {
			res.locals.posts = [];
			
			r.forEach(item => {
				const json = item.jsonInfo(80, 80, true);
				
				json.image = item.getThumb(80, 80, true);
				json.created = json.created.toUserDateString();
				json.url = item.getLink();
				
				['title', 'description'].forEach(function (k) {
					if (!json[k])
						return json[k] = '';
					
					json[k] = json[k][req.ml.lang] || json[k][req.ml.configLang] || '';
				});
				
				if (json.description.length > 93)
					json.description = json.description.truncate(190).replace(/(<([^>]+)>)/g, ' ');
				
				res.locals.posts.push(json);
			});
		})
		.then(res.htmlPage.send.bind(res.htmlPage))
		.catch(next);
}
