import {util} from "./util";
import {LipthusRequest, LipthusResponse} from "../index";
import {LipthusError} from "../classes/lipthus-error";

const SpamBlocker = require('express-spam-referral-blocker');

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

let spamReferersLoaded = false;

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
		
		if (req.site.conf.origin !== false) {
			const origin = req.site.conf.origin || req.headers.origin || '*';
			
			res.header('Access-Control-Allow-Origin', origin);
			res.header('Access-Control-Allow-Credentials', 'true');
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
	}
	
	export function spamBlocker(req: LipthusRequest, res: LipthusResponse, next: any) {
		// Ejecutamos la lista actual sin entorpecer el flujo
		SpamBlocker.send404(req, res, next);
		
		// comprobamos la lista
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
				
				return util.urlContent('https://raw.githubusercontent.com/piwik/referrer-spam-blacklist/master/spammers.txt')
					.then((r: string | any) => {
						const list2 = r.split('\n');
						
						// la última linea suele estar vacía
						if (!list2[list2.length - 1])
							list2.pop();
						
						const expire = new Date();
						
						expire.setDate(expire.getDate() + 7);
						
						return req.db.tmp.set('spamReferrers', list2, expire);
					})
					.then(spamReferrers2 => {
						if (!spamReferrers2)
							throw new Error('no spamReferrers list results');
						
						req.app.set('spamReferrers', spamReferrers2);
						
						SpamBlocker.setReferrers(spamReferrers2.value);
					});
			})
			.catch(next);
	}
	
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
}
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
