"use strict";

const Paginator = require('../modules/paginator');

module.exports = (req, res, next) => {
	let comments = {};

	return res.htmlPage
		.init({
			jQueryMobile: true,
			layout: 'moderator',
			pageTitle: req.site.config.sitename + ' - Comentarios',
			userLevel: 2,
			robots: 'noindex,nofollow'
		})
		.then(htmlPage => {
			if (!req.params.col) {
				const counts = {};

				if (req.query.reflink)
					req.session.commentsreflink = req.query.reflink;

				res.locals.reflink = req.session.commentsreflink || "/";

				return Promise.all(Object.keys(req.site.dbs).map(k =>
					req.site.dbs[k].model('comment').colCountIncPending()
						.then(r => {
							if (r) {
								Object.each(r, (j, rr) => {
									rr.name = j;
									counts[k + '.' + j] = rr;
								});
							}
						})
				))
					.then(() => htmlPage
						.addCSS('comments-counts')
						.send('comments-counts', {counts: counts}));
			}

			let page = parseInt(req.query.page) || 1;
			let filter = res.locals.filter = req.query.f || 'pending';
			let query = {};
			let vars = {db: req.db.name};
			let col;
			let opt = {
				sort: {created: -1},
				limit: 50,
				skip: (page - 1) * 50
			};

			if (req.params.col === '_') {
				comments = req.db.comment;
			} else {
				const ns = req.params.col.split('.');
				col = ns[1];
				vars.db = ns[0];
				comments = req.site.dbs[vars.db].comment;
			}

			switch (filter) {
				case 'active':
					query.active = true;
					vars.popupMsg = 'Rechazar este comentario?';
					break;
				case 'refused':
					query.refused = true;
					vars.popupMsg = 'Aprobar este comentario?';
					break;
				case 'pending':
				default:
					query.active = {$ne: true};
					query.refused = {$ne: true};
					vars.popupMsg = 'Aprobar o rechazar este comentario?';
					break;
			}

			comments.byColnameIncItemTitle(col, query, opt, (err, comments, total) => {
				if (err)
					return next(err);

				vars.comments = comments;

				if (total > 50)
					vars.paginator = new Paginator(page, total, '?f=' + filter);

				res.htmlPage
					.addCSS('comments-mng')
					.addJS('comments-mng.js')
					.send('comments-mng', vars);
			});
		})
		.catch(next);
};