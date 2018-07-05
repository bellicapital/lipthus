"use strict";

const fs = require('fs');

module.exports = function(req, res, next){
	const q = req.query;
	const schema = q.s;
	const id = q.id;
	const lang = q.lang || req.ml.lang;
	const ObjectId = req.db.mongoose.Types.ObjectId;
	const subscriptor = req.app.subscriptor;

	if(!q.w)
		q.w = 960;
	if(!q.h)
		q.h = 460;

	if(id && !ObjectId.isValid(id))
		return res.send('El id no es válido');

	//si no hay id, carga el último item

	res.locals.tpls = [
		'newItem',
		'itemActivated',
		'confirm-subscription'
	];

	res.locals.items = {};
	res.locals.q= q;
	res.locals.lang = lang;
	res.locals.availableLangs = req.site.availableLangs;

	req.db.dynobject.getKeys().forEach(k => {
		res.locals.items[k] = req.db.schemas[k].options.subscriptions;
	});

	Object.each(req.site.plugins, (k, v) => {
		if(v && v.mailTemplates)
			res.locals.items[k] = true;
	});

	if(!schema)
		return res.render('admin/mail-templates');

	let query;

	if(id)
		query = {_id: ObjectId(id)};

	req.db[schema]
		.findOne(query)
		.sort({natural: -1})
		.then(item => {
			q.id = item.id;

			if(!item)
				return res.status(404).send('Not found');

			const options = {lang: lang};
			let name;

			switch(q.type){
				case 'newItem':
					options.key = 'CREATED';

					name = fs.existsSync(req.site.dir + '/views/mail-templates/es/' + schema + '_created.pug') ? schema : 'item';

					options.template = name + '_created';

					break;

				case 'itemActivated':
					options.key = 'ACTIVATED';

					name = fs.existsSync(req.site.dir + '/views/mail-templates/es/' + schema + '_activated.pug') ? schema : 'item';

					options.template = name + '_activated';

					break;

				case 'confirm-subscription':
					options.template = 'confirm-subscription';
					options.subject = {es:'asunto'};//req.ml.all._CONFIRM_SUBJECT;
					break;

				default:
					return res.send('El evento "' + q.type + '" no está disponible');
			}

			getOptions(function(){
				req.app.site.notifier.preview(item, options, function(err, r){
					if(err)
						return next(err);

					res.render('admin/mail-templates', r);
				});
			});

			function getOptions(cb){
				switch(q.type){
					case 'confirm-subscription':
						req.db.lang.getValues('_CONFIRM_SUBJECT', function(err, r){
							if(err)
								return next(err);

							const subscriptionConfirmUri = req.site.conf.subscriptionConfirmUri || '/subscriptions/confirm';

							options.subject = r;
							options.content = {
	//							subscriptions: subscriptions,
								X_SITELOGO: req.protocol + '://' + req.headers.host + req.site.logo().uri,
								X_CONFIRM_LINK: req.protocol + '://' + req.headers.host + subscriptionConfirmUri + '?id=TEST'
							};

							cb();
						});
						break;

					default:
						subscriptor
							.getItemOptions(schema, item)
							.then(itemOpt => {
								Object.assign(options, itemOpt);

								cb();
							})
							.catch(next);
				}
			}
		})
		.catch(next);
};
