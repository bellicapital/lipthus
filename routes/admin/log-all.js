"use strict";

const ObjectId = require('mongoose').Types.ObjectId;

module.exports = (req, res, next) => {
	const query = {};
	const uids = {};
	const itemids = {};
	const itemsById = {};
	const fields = {
		field: 1,
		value: 1,
		uid: 1
	};

	res.locals.ths = [
		req.ml.all._DATE,
		'Quién'
	];

	res.locals.fields = [
		'date',
		'uname'
	];

	if(req.params.schema) {
		query.schema_ = req.params.schema;
		itemids[query.schema_] = {};
	} else {
		fields.schema_ = 1;
		res.locals.fields.push('schema');
		res.locals.ths.push('Tipo');
	}

	if(req.params.id) {
		query.itemid = req.params.id;
		itemids[query.schema_][req.params.id] = true;
	} else {
		fields.itemid = 1;
		res.locals.fields.push('item');
		res.locals.ths.push('Item');
	}

	res.locals.fields.push('field', 'value');
	res.locals.ths.push('Campo', 'Valor');

	req.db.user
		.find()
		.select('uname')
		.then(users => users.forEach(user => uids[user.id] = user.uname))
		.then(() => req.db.loggerUpdates
			.find(query)
			.sort({_id: -1})
			.select(fields)
			.limit(500)
		)
		.then(logs => {
			res.locals.logs = [];

			logs.forEach(log => {
				let v = log.value;

				if (v && v.contentType) {
					v = v.name
				} else if (v === null)
					v = '<i>elimidado</i>';

				const obj = {
					date: log._id.getTimestamp().toUserDatetimeString(),
					field: log.field,
					value: v,
					uname: uids[log.uid] || log.uid
				};

				let schemaName;

				if (log.schema_) {
					schemaName = log.schema_;
					obj.schema = '<a href="/item-log/' + schemaName + '">' + schemaName + '</a>';
				} else
					schemaName = req.params.schema;

				if (log.itemid) {
					if(!itemids[schemaName])
						itemids[schemaName] = {};

					obj.itemid = log.itemid;
					itemids[schemaName][log.itemid] = true;
				}

				res.locals.logs.push(obj);
			});
		})
		.then(() => {
			const promises = [];

			Object.each(itemids, (s, ids) =>
				req.db[s] && promises.push(
					req.db[s]
						.find({_id: {$in: Object.keys(ids)}})
						.select('title')
				)
			);

			return Promise.all(promises);
		})
		.then(r => {
			r.forEach(rr => rr.forEach(it => itemsById[it._id] = '<a href="/item-log/' + it.schema + '/' + it._id + '">' + it.title + '</a>'));

			res.locals.logs.forEach(log => log.item = itemsById[log.itemid]);
		})
		.then(() =>
			res.htmlPage
				.init({
					jQueryMobile: true,
					jQueryMobileTheme: 'cm',
					layout: 'moderator',
					userLevel: 3,
					title: req.params.schema ? req.params.schema : 'All items',
					view: 'admin/log-all',
					robots: 'noindex,nofollow'
				})
				.then(page => page.addCSS('item-log').send())
		)
		.catch(next);
};