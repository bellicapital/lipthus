"use strict";

const mongoose = require ('mongoose');

module.exports = function(req, res, next){
	res.htmlPage
		.init({
			jQueryMobile: true,
			jQueryUI: true,
			title: 'Site translate page',
			sitelogo: true,
			view: 'videouploader',
			layout: 'videouploader',
			userLevel: 2,
			userType: 'videouploader'
		})
		.then(page => {
			page.head
				.addJS('progressbar.js')
				.addJS('form/jquery.html5uploader.js')
				.addJS('form/filefield.js')
				.addJS('video.js')
				.addJS('videouploader-page.js')
				.addCSS('form.css')
				.addCSS('layout-mobile.css');

			const keys = req.db.dynobject.schema.statics.getKeys();
			let count = 0;
			const ret = {};

			keys.forEach(function (k) {
				const fields = {};
				const st = req.db[k].schema.tree;

				Object.each(st, (i, v) => {
					if (v.origType === 'video')
						fields[i] = v.caption;
				});

				if (!Object.keys(fields).length)
					return _finish();

				ret[k] = {fields: fields, items: {}};

				(function (k) {
					req.db[k].find({active: true}, 'title', {}, function (err, arr) {
						arr.forEach(function (r) {
							ret[k].items[r.id] = r.title;
						});

						_finish();
					});
				})(k);
			});

			function _finish() {
				if (++count === keys.length) {
					res.locals.videouploader = ret;

					page.addJSVars({videouploader: ret});

					page.send();
				}
			}
		});
};