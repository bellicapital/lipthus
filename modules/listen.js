"use strict";

const fs = require('fs');
const WebSocketServer = require('ws').Server;

module.exports = (app, cb) => {
	const config = app.site.config;
	const secure = config.protocol === 'https';
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
		if(config.external_protocol === 'https' || app.get('conf').trustProxy)
			app.enable('trust proxy');

		server = require('http').createServer(app);
	}

	Object.defineProperty(app, 'server', {get: () =>  server});

	const useSocket = app.enabled('socket');
	const dest = useSocket ? '/tmp/' + app.db.name + '.sock' : app.get('port');

	useSocket && fs.existsSync(dest) && fs.unlinkSync(dest);

	server.listen(dest);

	server.on('error', e => console.error(e));

	server.on('listening', () => {
		console.log(
			"  \u001b[36m info  -\u001b[0m Server listening on %s in %s mode. %s",
			dest,
			app.get('env'),
			(secure ? 'https:' : 'http:') + app.site.langUrl()
		);

		useSocket && fs.chmodSync(dest, '777');

		const wss = new WebSocketServer({server: server});

		wss.on("connection", (ws, req) =>{
			ws.created = new Date();
			ws.upgradeReq = req;

			ws.json = json => ws.send(JSON.stringify(json));

			ws.json({info: 'ws connected'});

			ws.on('message', m => {
				try{
					m = JSON.parse(m);
					ws.emit('json', m);
				} catch(e){}
			});
		});

		wss.broadcast = (data, path) => {
			wss.clients.forEach(client => {
				if(!path || client.upgradeReq.url === path)
					client.send(JSON.stringify(data), err => err && console.error(err));
			});
		};

		wss.getClients = path => {
			const ret = [];

			wss.clients.forEach(client => {
				if(client.upgradeReq.url.match(path))
					ret.push(client);
			});

			return ret;
		};

		Object.defineProperty(app, 'wss', {get: () => wss});

		if(!cb)
			return;

		cb.call(server, {
			port: app.get('port'),
			mode: app.get('env')
		});
	});
};