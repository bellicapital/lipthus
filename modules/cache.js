"use strict";

const debug = require('debug')('site:cache');

class Cache {
	constructor(s) {
		Object.extend(this, s);
	}

	getType(res) {
		if (res.cacheType)
			return res.cacheType;

		res.cacheType = 'all';

		if(this.varyDevice) {
			const dt = res.req.device.type;

			if(this.varyDevice.indexOf(dt) !== -1)
				res.cacheType = dt;
		}

		if (res.locals.justContent)
			res.cacheType += '-justContent';

		if(res.locals.gpsi)
			res.cacheType += '-gpsi';

		return res.cacheType;
	}

	getExpireMinutes(url) {
		let ret = null;

		Object.keys(this.uris).some(re => {
			if (new RegExp(re).test(url)) {
				ret = this.uris[re];

				return true;
			}
		});

		return ret;
	}

	static setResponse(res, body, expireMinutes) {
		res.cached.MongoBinData = new Buffer(body);
		res.cached.expires = Date.now() + expireMinutes * 60000;

		const ct = res.get('Content-Type');

		if(ct)
			res.cached.contentType = ct;

		res.cached.save(err => {
			/**
			 * Catching E11000 duplicate key error
			 * to avoid simultaneous request processing unique index error
			 *
			 * jj - 20/12/2017
			 * Using callback because Promise catching doesn't work
			 */

			if (!err)
				return;

			if (err.code !== 11000)
				console.error(err);
			else
				debug(err.message);
		});
	}
}

module.exports = function cache(cache){
	if(!cache)
		return;

	cache = new Cache(cache);

	return (req, res, next) => {
		if(req.method !== 'GET')
			return next();

		if(req.query._c){
			req.url = req.url.replace(/[?&]_c=[^&]*/, '');
			res.htmlPage.head.addLink({rel: 'canonical', href: req.url});
		}

		if(/^\/(videos|bdf|resimg|optimg|ajax\/|c\/|cache|admin|form-log|bot)/.test(req.path))
			return next();

		const expireMinutes = cache.getExpireMinutes(req.url);

		if(!expireMinutes)
			return next();

		const query = {
			uri: req.protocol + '://' + req.headers.host + req.url,
			device: cache.getType(res),
			lang: req.ml.lang
		};

		if(req.user)
			return req.db.cacheResponse.remove(query, next);

		req.db.cacheResponse
			.findOne(query)
			.then(cached => {
				if(req.query._c && cached)
					cached.remove();

				res.cached = cached;

				// capturar los envíos
				res.___send = res.send;

				res.send = body => {
					if(body && [200, 304].indexOf(res.statusCode) !== -1){
						if(!cached)
							res.cached = new req.db.cacheResponse(query);

						Cache.setResponse(res, body, expireMinutes);
					}

					res.headersSent || res.___send(body);
				};

				if(!cached)
					return next();

				if(req.query._c)
					return next();

				res.set({
					'Last-Modified': res.cached.modified.toUTCString(),
					'Expires': res.cached.expires.toUTCString(),
					'X-CMJS-Cached': true
				});

				if(res.cached.contentType)
					res.set('Content-Type', res.cached.contentType);

				res.___send(res.cached.MongoBinData.toString());

				debug(((res.cached.expires - new Date)/60000).toFixed(2) + ' minutos para limpiar cache de %s', res.cached.uri);

				if(res.cached.expires < new Date)
					next();
			})
			.catch(next);
	};
};
