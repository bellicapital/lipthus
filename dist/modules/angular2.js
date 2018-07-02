"use strict";

const fs = require('mz/fs');
console.trace(888)

class Angular2{

	constructor(app, route, path){
		this.app = app;
		this.route = route;
		this.path = path;
		this.dist = this.path + '/dist';
		this.indexCache;
		this.ffound = []; // tmp files already found in dist/
	}

	init(){
		return fs.readFile(this.dist + '/index.html', 'utf8')
			.then(raw => {
				// modify base url & store index.html in indexCache
				this.indexCache = raw.replace(/base href="\/"/, 'base href="/' + this.route + '/"');
			})
			.then(() => {
				this.app.use('/' + this.route, this.middelware.bind(this));
			});
	}

	middelware(req, res, next){
		if(req.url === '/')
			return res.send(this.indexCache);

		const file = this.dist + req.url;

		if(this.ffound.indexOf(req.url) !== -1)
			return res.sendFile(file);

		fs.exists(file)
			.then(exists => {
				this.ffound.push(req.url);

				return res.sendFile(file);
			})
			.catch(next);
	}

	static serve(app, route, path){l(route, path)
		return new Angular2(app, route, path).init();
	}
}

module.exports = Angular2;