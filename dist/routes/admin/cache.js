"use strict";

module.exports = function (req, res, next){
	res.htmlPage
		.init({
			view: 'admin/cache'
		})
		.then(() => req.db.cacheResponse.distinctCount('device'))
		.then(devicesCount => {
			res.locals.devicesCount = devicesCount;

			res.locals.devices = Object.keys(devicesCount);

			return req.db.cacheResponse.distinct('lang');
		})
		.then(langs => {
			if(!langs || !langs.length)
				return res.htmlPage.send();

			let count = 0;

			res.locals.langDevices = {};

			langs.forEach(lang => {
				res.locals.langDevices[lang] = [];

				req.db.cacheResponse
					.distinctCount('device', {lang: lang})
					.then(c => {
						res.locals.devices.forEach(d => res.locals.langDevices[lang].push(c[d] || 0));

						if(++count === langs.length){
							if(!req.query.device)
								return res.htmlPage.send();

							req.db.cacheResponse
								.find(req.query, 'uri created', {sort: {created: -1}})
								.then(uris => {
									res.locals.uris = uris;

									res.htmlPage.send();
								})
								.catch(next);
						}
					})
					.catch(next);
			});
		})
		.catch(next);
};