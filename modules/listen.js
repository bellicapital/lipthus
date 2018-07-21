"use strict";

const fs = require('fs');
const WebSocketServer = require('ws').Server;

module.exports = (app) => {
	const secure = app.site.protocol === 'https';
	let server;

	if(secure){
		let ssl = app.get('conf').ssl;

		if(!ssl){
			ssl = {
				"key": "/etc/letsencrypt/live/" + app.site.key + "/privkey.pem",
				"cert": "/etc/letsencrypt/live/" + app.site.key + "/fullchain.pem",
				"ca": [
					"/etc/letsencrypt/live/" + app.site.key + "/chain.pem"
				],
				"dhparam": "/etc/letsencrypt/dhparam.pem"
			};
		}

		const sslContent = {

		};

		Object.each(ssl, (k, v) => {
			if(k === 'ca'){
				sslContent[k] = [];
				v.forEach(f => sslContent[k].push(fs.readFileSync(f)));
			} else
				sslContent[k] = fs.readFileSync(v);
		});

		server = require('https').createServer({
			key: fs.readFileSync(ssl.key),
			cert: fs.readFileSync(ssl.cert)
		}, app);
	} else {
		// noinspection JSUnresolvedVariable
		if (app.site.externalProtocol === 'https' || app.get('environment').trustProxy)
			app.enable('trust proxy');

		server = require('http').createServer(app);
	}

	Object.defineProperty(app, 'server', {get: () =>  server});

	const environment = app.get('environment');
	const target = environment.socket ? '/tmp/' + environment.socket + '.sock' : environment.port;

	environment.socket && fs.existsSync(target) && fs.unlinkSync(target);

	return new Promise((ok, ko) => {
		server.listen(target);

		server.on('error', ko);

		server.on('listening', () => {
			console.log(
				"  \u001b[36m info  -\u001b[0m Server listening on %s in %s mode. %s",
				target,
				app.get('env'),
				app.site.externalProtocol + ':' + app.site.langUrl()
			);

			environment.socket && fs.existsSync(target) && fs.chmodSync(target, '777');

			const wss = new WebSocketServer({server: server});

			wss.on("connection", (ws, req) => {
				ws.created = new Date();
				ws.upgradeReq = req;

				ws.json = json => ws.send(JSON.stringify(json));

				ws.json({info: 'ws connected'});

				ws.on('message', m => {
					try {
						m = JSON.parse(m);
						ws.emit('json', m);
					} catch (e) {
					}
				});
			});

			wss.broadcast = (data, path) => {
				wss.clients.forEach(client => {
					if (!path || client.upgradeReq.url === path)
						client.send(JSON.stringify(data), err => err && console.error(err));
				});
			};

			wss.getClients = path => {
				const ret = [];

				wss.clients.forEach(client => {
					if (client.upgradeReq.url.match(path))
						ret.push(client);
				});

				return ret;
			};

			Object.defineProperty(app, 'wss', {get: () => wss});

			ok({
				port: target,
				mode: app.get('env')
			});
		});
	});
};
