"use strict";


const SpamBlocker = require('express-spam-referral-blocker');
const urlContent = require('./utils').urlContent;

class Security {
	constructor(req) {
		Object.defineProperties(this, {
			req: {value: req}
		});
	}

	csrf(cb) {
		const csrf = this.req.app.get('csrf');

		cb();
//	csrf(this.req, this.req.res, cb);
	}
}

let spamReferersLoaded = false;

module.exports = {
	main: function (req, res, next) {
		let bi = req.app.get('blockedIps');

		function throwMsg(msg, block) {
			if (!bi) {
				bi = [];
				req.app.set('blockedIps', bi);
			}

			block && bi.push(req.ip);

			const err = new Error('Security alert! Detected: "' + msg + '"');

			err.status = 400;
			err.type = 'security';

			return next(err);
		}

		if (bi && bi.indexOf(req.ip) > -1)
			return next(new Error('blocked ip ' + req.ip));

		if (req.path.indexOf("/resource") === 0)
			return throwMsg('attack');

		if (req.path.indexOf("/wp-") !== -1)
			return throwMsg('attack');

		if (/^\/(index|default)/.test(req.path))
			return throwMsg('attack');

		const referer = req.get('referer');

		if (referer && referer.indexOf("/wp-") !== -1)
			return throwMsg('attack');

		req.security = new Security(req);

		if (req.site.conf.origin !== false) {
			const origin = req.site.conf.origin || req.headers.origin || '*';

			res.header('Access-Control-Allow-Origin', origin);
			res.header('Access-Control-Allow-Credentials', true);
			res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
			res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-HTTP-Method-Override, Content-Type, Authorization, Accept');
		}

		// intercept OPTIONS method
		if ('OPTIONS' === req.method) {
			res.header('Access-Control-Max-Age', '86400'); // 24 hours
			res.writeHead(200);

			return res.end();
		}

		next();
	},
	spamBlocker: function (req, res, next) {
		//Ejecutamos la lista actual sin entorpecer el flujo
		SpamBlocker.send404(req, res, next);

		//comprobamos la lista
		const list = req.app.get('spamReferrers');

		if (list && !list.expired()) {
			if (!spamReferersLoaded) {
				spamReferersLoaded = true;
				SpamBlocker.setReferrers(list.value);
				SpamBlocker.addToReferrers(spamList);
			}
			return;
		}

		req.db.tmp.get('spamReferrers')
			.then(spamReferrers => {
				if (spamReferrers && !spamReferrers.expired()) {
					req.app.set('spamReferrers', spamReferrers);

					return SpamBlocker.setReferrers(spamReferrers.value);
				}

				return urlContent('https://raw.githubusercontent.com/piwik/referrer-spam-blacklist/master/spammers.txt')
					.then(list => {
						list = list.split('\n');

						//la última linea suele estar vacía
						if (!list[list.length - 1])
							list.pop();

						const expire = new Date();

						expire.setDate(expire.getDate() + 7);

						return req.db.tmp.set('spamReferrers', list, expire);
					})
					.then(spamReferrers => {
						if (!spamReferrers)
							throw new Error('no spamReferrers list results');

						req.app.set('spamReferrers', spamReferrers);

						SpamBlocker.setReferrers(spamReferrers.value);
					});
			})
			.catch(next);
	}
};

const spamList = [
	'http://trafficmonetize.org',
	'http://offers.bycontext.com',
	'http://bar112233778899.blog.fc2.com',
	'http://www2.free-social-buttons.com',
	'http://search.iminent.com',
	'http://searches.vi-view.com',
	'http://plus.url.google.com',
	'http://100dollars-seo.com',
	'http://search.webssearches.com'];

/*
 4webmasters.org
 trafficmonetize.org
 offers.bycontext.com
 buttons-for-your-website.com
 www.event-tracking.com
 bar112233778899.blog.fc2.com
 sanjosestartups.com
 www2.free-social-buttons.com
 search.iminent.com
 100dollars-seo.com
 searches.vi-view.com
 plus.url.google.com
 search.webssearches.com
 */