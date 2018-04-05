"use strict";

const fs = require('mz/fs');
const ObjectId = require('mongoose').mongo.ObjectId;

module.exports = (req, res, next) => {
	const customScript = req.site.dir + '/routes/item-comments.js';

	fs.access(customScript)
		.then(() => require(customScript)(req, res, next))
		.catch(err => {
			if(err.code !== 'ENOENT')
				return next(err);

			req.db.comment
				.find4show({
					active: true,
					'ref.$id': ObjectId(req.params.itemid)
				}, 100)
				.then(comments => res.locals.comments = comments)
				.then(() => req.ml.load('ecms-comment'))
				.then(lc => res.locals.LC = lc)
				.then(() => res.render('include/item-comments'))
				.catch(next);
		});
};
