import {Types} from "mongoose";
import {NextFunction} from "express";

const ObjectId = Types.ObjectId;

export function userPage(req: any, res: any, next: NextFunction) {
	const query = ObjectId.isValid(req.params.uid) ? {_id: ObjectId(req.params.uid)} : {uname: req.params.uid};

	req.db.user
		.findOne(query)
		.then((user: any) => user ? res.htmlPage.setItem(user) : Promise.reject(new Error('Not user')))
		.then(() => req.ml.load("ecms-user"))
		.then(() => res.htmlPage
			.init({
				pageTitle: req.site.config.sitename + ' -> users -> ' + res.locals.item.getName(),
				layout: 'base',
				view: 'user',
				userLevel: 1
			})
		)
		.then((p: any) => p.addCSS('user').send())
		.catch(next);
}
