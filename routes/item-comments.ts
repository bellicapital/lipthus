import {LipthusComment, LipthusRequest, LipthusResponse} from "../index";
import {NextFunction} from "express";
import {KeyString} from "../interfaces/global.interface";

const fs = require('fs');
const ObjectId = require('mongoose').mongo.ObjectId;

export default (req: LipthusRequest, res: LipthusResponse, next: NextFunction) => {
	const customScript = req.site.dir + '/routes/item-comments.js';

	if (fs.existsSync(customScript))
		return require(customScript)(req, res, next)
			.catch(next);

	req.db.comment
		.find4show({
			active: true,
			'ref.$id': ObjectId(req.params.itemid)
		}, 100)
		.then((comments: Array<LipthusComment>) => res.locals.comments = comments)
		.then(() => req.ml.load('ecms-comment'))
		.then((lc: KeyString) => res.locals.LC = lc)
		.then(() => res.render('include/item-comments'))
		.catch(next);
};
