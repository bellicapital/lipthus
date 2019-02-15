import * as Debug from "debug";

const debug = Debug('site:cache');

class Cache {

	public varyDevice: string;
	public uris: {[s: string]: string};

	constructor(s: any) {
		Object.assign(this, s);

		this.varyDevice = s.varyDevice;
		this.uris = s.uris;
	}

	getType(res: any) {
		if (res.cacheType)
			return res.cacheType;

		res.cacheType = 'all';

		if (this.varyDevice) {
			const dt = res.req.device.type;

			if (this.varyDevice.indexOf(dt) !== -1)
				res.cacheType = dt;
		}

		if (res.locals.justContent)
			res.cacheType += '-justContent';

		if (res.locals.gpsi)
			res.cacheType += '-gpsi';

		return res.cacheType;
	}

	getExpireMinutes(url: string) {
		let ret = null;

		Object.keys(this.uris).some(re => {
			if (new RegExp(re).test(url)) {
				ret = this.uris[re];

				return true;
			}

			return false;
		});

		return ret;
	}

	static setResponse(res: any, body: string, expireMinutes: number) {
		res.cached.set('MongoBinData', Buffer.from(body));
		res.cached.set('expires', Date.now() + expireMinutes * 60000);

		const ct = res.get('Content-Type');

		if (ct)
			res.cached.set('contentType', ct);

		res.cached.save()
			.catch((err: any) => {
			/**
			 * Catching E11000 duplicate key error
			 * to avoid simultaneous request processing unique index error
			 */

			if (err.code !== 11000)
				console.error(err);
			else
				debug(err.message);
		});
	}
}


export default (cache: any) => {
	if (!cache)
		return;

	cache = new Cache(cache);

	return (req: any, res: any, next: any) => {
		if (req.method !== 'GET')
			return next();

		if (req.query._c)
			req.url = req.url.replace(/[?&]_c=[^&]*/, '');

		if (/^\/(videos|bdf|resimg|optimg|ajax\/|c\/|cache|admin|form-log|bot)/.test(req.path))
			return next();

		const expireMinutes = cache.getExpireMinutes(req.url);

		if (!expireMinutes)
			return next();

		const query = {
			uri: req.protocol + '://' + req.headers.host + req.url,
			device: cache.getType(res),
			lang: req.ml.lang
		};

		if (req.user)
			return req.db.cacheResponse.remove(query, next);

		req.db.cacheResponse
			.findOne(query)
			.then((cached: any) => {
				if (req.query._c && cached)
					cached.remove();

				res.cached = cached;

				// capturar los envíos
				res.___send = res.send;

				res.send = (body: string) => {
					if (body && [200, 304].indexOf(res.statusCode) !== -1) {
						if (!cached)
							res.cached = new req.db.cacheResponse(query);

						Cache.setResponse(res, body, expireMinutes);
					}

					if (!res.headersSent)
						res.___send(body);
				};

				if (!cached)
					return next();

				if (req.query._c)
					return next();

				res.set({
					'Last-Modified': res.cached.modified.toUTCString(),
					'Expires': res.cached.expires.toUTCString(),
					'X-CMJS-Cached': true
				});

				if (res.cached.contentType)
					res.set('Content-Type', res.cached.contentType);

				res.___send(res.cached.MongoBinData.toString());

				debug(((res.cached.expires.getTime() - Date.now()) / 60000).toFixed(2) + ' minutos para limpiar cache de %s', res.cached.uri);

				if (res.cached.expires < new Date)
					next();
			})
			.catch(next);
	};
};
