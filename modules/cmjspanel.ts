const referer = 'chrome-extension://nmcejgccdkggcjbdmohhmaiejndkggif';

export const LipthusDevPanel = (req: any, res: any, next: any) => {
	if (req.get('Origin') !== referer && !req.get('x-cmjs-panel'))
		return next();

	res.header('Access-Control-Allow-Origin', req.headers.origin || referer);

	const panelSend = res.send;

	res.send = function () {
		try {
			if (!res.get('Content-Type')) {
				req.db.tmp.set('cmjspanel-' + req.session.id, JSON.stringify(res.locals))
					.then((tmp: any) => res.set('cmjs-panel-req-id', tmp.id))
					.then(() => panelSend.apply(res, arguments));
			} else
				panelSend.apply(res, arguments);
		} catch (err) {
			req.logError(err);
		}
	};

	next();
};
