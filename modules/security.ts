import {LipthusRequest, LipthusResponse} from "../index";
import {LipthusError} from "../classes/lipthus-error";


class Security {

	constructor(public req: LipthusRequest) {
		Object.defineProperties(this, {
			req: {value: req}
		});
	}

	// noinspection JSMethodCanBeStatic
	csrf(cb: any) {
		// const csrf = this.req.app.get('csrf');

		cb();
		// csrf(this.req, this.req.res, cb);
	}
}

export namespace security {
	export function main(req: LipthusRequest, res: LipthusResponse, next: any) {
		let bi = req.app.get('blockedIps');

		const throwMsg = (msg: string) => {
			if (!bi) {
				bi = [];
				req.app.set('blockedIps', bi);
			}

			// bloquear
			// bi.push(req.ip);

			const err = new LipthusError('Security alert! Detected: "' + msg + '"');

			err.status = 400;
			err.type = 'security';

			return next(err);
		};

		if (bi && bi.indexOf(req.ip) > -1)
			return next(new Error('blocked ip ' + req.ip));

		if (req.path.indexOf("/resource") === 0)
			return throwMsg('attack');

		if (req.path.indexOf("/wp-") !== -1)
			return throwMsg('attack');

		if (/^\/(\.php|default)/.test(req.path))
			return throwMsg('attack');

		const referer = req.get('referer');

		if (referer && referer.indexOf("/wp-") !== -1)
			return throwMsg('attack');

		req.security = new Security(req);

		if (req.site.environment.origin !== false) {
			const origin = req.site.environment.origin || req.headers.origin || '*';

			res.set('Access-Control-Allow-Origin', origin + '');
			res.set('Access-Control-Allow-Credentials', 'true');
			res.set('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
			res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-HTTP-Method-Override, Content-Type, Authorization, Accept, If-None-Match');

			if (req.site.environment.allowHeaders)
				res.append('Access-Control-Allow-Headers', req.site.environment.allowHeaders);
		}

		// intercept OPTIONS method
		if ('OPTIONS' === req.method) {
			res.header('Access-Control-Max-Age', '86400'); // 24 hours
			res.writeHead(200);

			return res.end();
		}

		next();
	}
}
