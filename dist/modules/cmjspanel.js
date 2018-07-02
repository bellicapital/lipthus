"use strict";

const debug = require('debug')('site:cmjspanel');
const referer = 'chrome-extension://nmcejgccdkggcjbdmohhmaiejndkggif';

module.exports = (req, res, next) => {
	if(req.get('Origin') !== referer && !req.get('x-cmjs-panel'))
		return next();

	res.header('Access-Control-Allow-Origin', req.headers.origin || referer);

	const panelSend = res.send;

	res.send = function() {
		try {
			if (!res.get('Content-Type')) {
				req.db.tmp.set('cmjspanel-' + req.session.id, JSON.stringify(res.locals))
					.then(tmp => res.set('cmjs-panel-req-id', tmp.id))
					.then(() => panelSend.apply(res, arguments));
			} else
				panelSend.apply(res, arguments);
		} catch(err){
			req.logError(err);
		}
	};

	next();
};