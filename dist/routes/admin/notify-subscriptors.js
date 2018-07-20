/**
 * notify an item event to subscriptors
 */

"use strict";

module.exports = function(req, res, next){
	res.htmlPage
		.init({
			jQueryMobile: true,
			jQueryMobileTheme: 'default',
			pageTitle: 'Notify subscriptors',
			layout: 'base',
			view: 'admin/notify-subscriptors',
			userLevel: 2
		})
		.then(page => {
			let q = req.query;

			if (!q.s || !q.id || !q.type)
				return next();

			return req.db[q.s]
				.findById(q.id, 'title')
				.then(item => {
					res.locals.q = q;

					page
						.addCSS('notify-subscriptors')
						.setItem(item);

					if (req.method === 'POST') {
						let cb = (err, r) => {
							if (err)
								res.locals.msg = err.message;
							else if (r.subscribed.length) {
								res.locals.msg = 'Se ha enviado la notificación a ' + r.subscribed.length + ' destino';

								if (r.subscribed.length > 1)
									res.locals.msg += 's';
							} else
								res.locals.msg = 'No se han encontrado usuarios subscritos';

							page.send();
						};

						let scriptMethod = req.app.subscriptor.getItemScript(q.s)[req.body.type];

						if (!scriptMethod)
							return cb(new Error('Script method ' + q.s + ' => ' + req.body.type + ' not found'));

						scriptMethod.call(req.app.subscriptor, item, {
							testmode: !!req.body.testmode,
							done: cb
						});
					} else {
						req.db.notilog.find({
							item: item._id,
							opt: {$exists: true}
						}, '-_id created opt.key').sort({created: -1})
							.then(function (notis) {
								if (notis.length) {
									const actions = {
										ACTIVATED: 'Active',
										CREATED: 'New'
									};

									notis.forEach(function (noti, i) {
										if (!noti.opt)
											return;

										notis[i] = {
											date: noti.created.hmFull(),
											action: actions[noti.opt.key] || noti.opt.key
										};
									});

									res.locals.notifications = notis;
								}

								res.locals.csrfToken = req.csrfToken();

								page.send();
							})
							.catch(next);
					}
				});
		})
		.catch(next);
};
