"use strict";

module.exports = function (req, res, next){
	res.locals.reflink = req.query.reflink;

	res.htmlPage
		.init({
			view: 'admin/form-log'
		})
		.then(() => req.db.formlog.distinctCount('tag'))
		.then(counts => {
			let tags = Object.keys(counts);

			res.locals.tags = tags.length ? counts : null;

			if(!req.params.tag) {
				if(tags.length) {
					let uri = '/form-log/' + tags[0];

					if(req.query.reflink)
						uri += '?reflink=' + req.query.reflink;

					return res.redirect(uri);
				}

				return res.htmlPage.send();
			}

			res.locals.tag = req.params.tag;

			return req.db.formlog
				.find({tag: req.params.tag})
				.sort({created: -1})
				.then(r => res.locals.forms = r.map(f => f.toObject()))
				.then(res.htmlPage.send.bind(res.htmlPage));
		})
		.catch(next);
};