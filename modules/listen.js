"use strict";

const fs = require('fs');
const WebSocketServer = require('ws').Server;

module.exports = function listen(app, cb){
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

	Object.defineProperty(app, 'server', {get: function(){return server;}});

	server.on('error', function (e) {
		console.error(e, 'port: ' +  app.get('port'));
	});

	server.listen(app.get('port'), () => {
		console.log(
			"  \u001b[36m info  -\u001b[0m Server listening on port %d in %s mode. %s",
			app.get('port'),
			app.get('env'),
			(secure ? 'https:' : 'http:') + app.site.langUrl()
		);
		
		const wss = new WebSocketServer({server: server});
		
		wss.on("connection", function(ws){
			ws.created = new Date();
			
			ws.json = function(json){
				ws.send(JSON.stringify(json));
			};
			
			ws.json({info: 'ws connected'});
			
			ws.on('message', function(m){
				try{
					m = JSON.parse(m);
					ws.emit('json', m);
				} catch(e){}
			});
		});
		
		wss.broadcast = function(data, path){
			this.clients.forEach(function(client){
				if(!path || client.upgradeReq.url === path)
					client.send(JSON.stringify(data), function(err){err && console.error(err);});
			});
		};
		
		wss.getClients = function(path){
			const ret = [];
			
			this.clients.forEach(function(client){
				if(client.upgradeReq.url.match(path))
					ret.push(client);
			});
			
			return ret;
		};
		
		Object.defineProperty(app, 'wss', {get: function(){return wss;}});
		
		if(!cb)
			return;
		
		cb.call(server, {
			port: app.get('port'),
			mode: app.get('env')
		});
	});
};