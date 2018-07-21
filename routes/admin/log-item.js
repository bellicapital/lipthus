"use strict";

const {ObjectId} = require('mongoose').Types;

module.exports = (req, res, next) => {
	const schema = req.params.schema;
	const id = ObjectId(req.params.id);

	req.db[schema]
		.findById(id)
		.then(item => {
			if(!item)
				return next();

			res.locals.item = item;

			req.logger
				.collection('updates')
				.find({
					schema_: schema,
					itemid: id
				})
				.sort({_id: -1})
				.toArray((err, logs) => {
					if(err)
						return next(err);

					res.locals.logs = [];
					let uids = {};

					logs.forEach(log => {
						let v = log.value;

						if(v && v.contentType){
							if(v.contentType.indexOf('image/') === 0)
								v = '<img style="max-width:150px" src="data:' + v.contentType + ';base64,' + v.MongoBinData.buffer.toString('base64') + '"/>';
							else
								v = v.name
						} else if(v === null)
							v = '<i>elimidado</i>';

						res.locals.logs.push({
							date: log._id.getTimestamp().toUserDatetimeString(),
							field: log.field,
							value: v,
							uid: log.uid
						});

						uids[log.uid] = log.uid;
					});

					req.db.user
						.find({_id: {$in: Object.values(uids)}})
						.select('uname')
						.then(users => {
							users.forEach(user => {
								uids[user.id] = user.uname;
							});

							res.locals.logs.forEach(log => log.uname = uids[log.uid]);

							return res.htmlPage
								.init({
									layout: 'moderator',
									userLevel: 3,
									view: 'admin/log-item',
									robots: 'noindex,nofollow'
								});
						})
						.then(page => page.addCSS('item-log').send())
						.catch(next);
				});
		})
		.catch(next);
};
