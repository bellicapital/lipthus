"use strict";

const mongoose = require('mongoose');
const util = require('util');

module.exports = function(req, res, next){
	const toRetreave = [];
	const subscriptor = req.app.subscriptor;

	const retreave = cb => {
		let count = 0;
		let subscriptions = [];

		toRetreave.forEach(tr => {
			const colname = tr.colname.replace('dynobjects.', '');
			const col = req.site.dbs && req.site.dbs[tr.dbname] && req.site.dbs[tr.dbname][colname] || req.db[colname];

			if(!col)
				throw new Error('Model ' + colname + ' does not exists in db ' + req.db);

			if(!tr.items){
				const identifier = col.schema.options.identifier || 'title';
				const name = col.schema.options[identifier] || col.schema.options.name;
				const title = name[req.ml.lang] || name.es;

				if(!tr.events)
					subscriptions.push(title);
				else
					tr.events.forEach(event => subscriptions.push(req.ml.all['_SUBS_' + event + '_' + colname] || req.ml.all['_SUBS_' + event]));

				if(++count === toRetreave.length)
					cb(subscriptions);
			} else {
				col.find({_id: {$in: items}})
					.select('title')
					.then(r => {
						r.forEach(i => subscriptions.push(i.title));

						if(++count === toRetreave.length)
							cb(subscriptions);
					})
					.catch(next);
			}
		});
	};

	function _next(err, notify){
		if(typeof err === 'string')
			err = new Error(err);

		if(!res.headersSent)
			res.send({error: err.message});

		if(notify)
			req.notifyError(err);
	}

	// noinspection FallThroughInSwitchStatementJS
	switch(req.params.action){
		case 'addItem':
			if(!req.body.id)
				return _next('no item id to add', true);

			const db = req.body.db || req.site.db.name;

			req.body.to = {};
			req.body.to[db] = {};
			req.body.to[db][req.body.colname] = {items: [req.body.id]};

		case 'add':
			if(!req.body.email)
				return _next('No email provided');

			if(!req.body.to || typeof req.body.to === 'string' || !Object.keys(req.body.to))
				return _next('No target provided');

			Object.each(req.body.to, (dbname, to) => {
				Object.each(to, (colname, todbcol) => {
					if(todbcol.events)
						toRetreave.push({
							dbname: dbname,
							colname: colname,
							events: todbcol.events
						});

					if(!todbcol.items)
						return;

					let items = [];

					todbcol.items.forEach((s, i) => {
						if(!s)
							return _next('Empty parameter in items.\nPost: ' + util.inspect(req.body) + '\n' + req.originalUrl, true);

						if(typeof s === 'string')
							todbcol.items[i] = mongoose.Types.ObjectId(s);
						else if(s.id && typeof s.id === 'string')
							s.id = mongoose.Types.ObjectId(s.id);

						items.push(todbcol.items[i]);
					});

					if(items.length)
						toRetreave.push({
							dbname: dbname,
							colname: colname,
							items: items
						});
				});
			});

			req.ml.load(['ecms-subscription', 'subscription'])
				.then(() => retreave(subscriptions => {
					subscriptor.log('request', req.body.email, req.body.to);

					const params = {
						email: req.body.email,
						subscriptions: req.body.to,
						lang: req.ml.lang,
						url: req.get('referer')
					};

					req.db.subscriptionRequest
						.create(params)
						.then(subscription => {
							const subscriptionConfirmUri = req.site.environment.subscriptionConfirmUri || '/subscriptions/confirm';

							const opt = {
								to: req.body.email,
		//						bcc: req.site.config.webmastermail,
								subject: req.ml.all._CONFIRM_SUBJECT, // Subject line
								lang: req.ml.lang,
								body: {
									subscriptions: subscriptions,
									X_SITELOGO: req.protocol + '://' + req.headers.host + req.site.logo().uri,
									X_CONFIRM_LINK: req.protocol + '://' + req.headers.host + subscriptionConfirmUri + '?id=' + subscription._id + '&email=' + req.body.email
								},
								tpl: 'confirm-subscription',
								forceEmbeddedImages: true
							};

							return req.site.notifier.toEmail(opt)
								.then(() => res.send(true))
								.catch(err => _next('Lo siento. Ha ocurrido un error. ' + err.message, true));
						})
						.catch(_next);
				}));

			break;

		case 'confirm':
			subscriptor
				.userConfirm(req.query.id)
				.then(req.ml.load.bind(req.ml, 'ecms-subscription'))
				.then(() => res.htmlPage.msg(req.ml.all._SUBS_thanks))
				.catch(next);
			break;

		default:
			next();
	}
};
