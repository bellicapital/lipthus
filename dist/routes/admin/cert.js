"use strict";

const pem = require('pem');
const fs = require('fs');

module.exports = function(req, res, next){
	const domain = req.site.conf.domain.production;
	
	certInfo('/etc/letsencrypt/live/' + domain + '/cert.pem', (err, cert) => {
		if(err)
			return next(err);

		const cmd = 'sudo -H /usr/share/letsencrypt/letsencrypt-auto certonly --webroot -w /etc/letsencrypt/webroot/';
		res.locals.cert = cert;


		// create

		res.locals.cmd =  cmd;

		let hosts = [domain];

		Object.keys(req.site.availableLangs).forEach(function(code){
			let host = req.site.langUrl(code).substr(2);

			if(host !== domain)
				hosts.push(host);
		});

		for(let host of hosts){
			res.locals.cmd += ' -d ' + host;
		}


		// renew

		if(cert){
			res.locals.renewcmd =  cmd;

			hosts = [];

			for(let host of cert.san.dns){
				hosts.push(host);
			}

			let dhostidx = hosts.indexOf(domain);

			if(dhostidx !== -1){
				hosts.splice(dhostidx, 1);
				hosts.unshift(domain);
			}

			for(let host of hosts){
				res.locals.renewcmd += ' -d ' + host;
			}
		}

		res.locals.nginx = "server {\n\
	listen 80;\n\
	server_name *." + domain + ";\n\
\n\
	location /.well-known/ {\n\
		alias /etc/letsencrypt/webroot/.well-known/;\n\
	}\n\
	location / {\n\
		........\n\
		#return 301 https://$host$request_uri;\n\
	}\n\
}";

		res.htmlPage
			.init({
				jQueryMobile: true,
				jQueryMobileTheme: 'default',
				pageTitle: 'Certificates',
				layout: 'base',
				view: 'admin/cert',
				userLevel: 3
			})
			.then(page => page.send());
	});
};

function certInfo(path, cb){
	fs.readFile(path, function(err, cert){
		if(err || !cert)
			return cb();

		pem.readCertificateInfo(cert, (err, file) => {
			if(err)
				return cb(err);

			file.validity.start = new Date(file.validity.start);
			file.validity.end = new Date(file.validity.end);

			cb(null, file);
		});
	});
}