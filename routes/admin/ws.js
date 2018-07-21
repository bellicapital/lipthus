"use strict";

module.exports = function(req, res, next){

	const states = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];

	res.htmlPage
		.init({
			pageTitle: 'Websocket monitor',
			layout: 'base',
			view: 'admin/ws',
			userLevel: 3
		})
		.then(() => res.locals.clients = req.app.wss.clients.map(client => {
				const u = client.upgradeReq;
				const h = u.headers;

				return {
					state: states[client.readyState],
					url: u.url,
					host: h.host,
					origin: h.origin,
					key: h['sec-websocket-key'],
					ip: h['x-forwarded-for'] || u.connection.remoteAddress,
					port: u.connection.remotePort,
					created: client.created.toUserDatetimeString()
				};
			})
		)
		.then(res.htmlPage.send.bind(res.htmlPage))
		.catch(next);
};
