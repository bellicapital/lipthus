"use strict";

const fs = require('mz/fs');
const exec = require('child_process').exec;

class Ng2helper {
	constructor(app, dir, route, userLevel, routes){
		this.dir = dir || app.get('dir');
		this.dist = dir;// + '/dist';
		this.route = route;
		this.routes = routes || ['/'];
		this.userLevel = userLevel;
		this.ffound = [];
		this.notffound = [];
		this.indexFile = '';
		
		Object.defineProperty(this, 'app', {value: app});
	}
	
	serveIfBuild(){
		return fs.exists(this.dist)
			.then(exists => exists && this.doServe());
	}
	
	doServe(){
		return fs.readFile(this.dist + '/index.html', 'utf8')
			.then(raw =>
				// modify base url & store index.html in indexCache
				this.indexFile = raw.replace(/base href="\/"/, 'base href="' + this.route + '/"')
			)
			.then(() => this.app.use(this.route, this.middelware.bind(this)));
	}
	
	middelware(req, res, next){
		this.checkUserLevel(req)
			.then(ok => {
				if(!ok)
					return res.redirect('/login?referrer=' + encodeURIComponent(this.route/* + req.url*/) + '&msg=No tienes permiso para acceder aquí');
				
				if (req.path === '/' || this.routes.indexOf(req.path) !== -1 || this.notffound.indexOf(req.path) !== -1)
					return res.send(this.indexFile);
				
				const file = this.dist + req.path;
				
				if (this.ffound.indexOf(req.path) !== -1)
					return res.sendFile(file);
				
				return fs.exists(file)
					.then(exists => {
						if (exists) {
							this.ffound.push(req.path);
							
							return res.sendFile(file);
						} else {
							this.notffound.push(req.path);
							
							return res.send(this.indexFile);
						}
					});
			})
			.catch(next);
	}
	
	checkUserLevel(req){
		if(!this.userLevel)
			return Promise.resolve(true);
		
		return req.getUser()
			.then(user => user && user.level >= this.userLevel);
	}
	
	static serve(app, dir, route, userLevel, routes) {
		return new Ng2helper(app, dir, route, userLevel, routes).serveIfBuild();
	}
}


const methods = {
	
	serve(app){
		const dir = app.get('dir');
		const lipthusRoutes = app.get('lipthusDir') + '/ng-routes';
		const customRoutes = dir + '/ng-routes';
		const serve = Ng2helper.serve;
		const conf = app.site.package.config.ngRoutes || {};

		return fs.exists(dir + '/.angular-cli.json')
			.then(exists => exists && serve(app, dir, '/home'))
			.then(() => fs.readdir(lipthusRoutes))
			.then(r => Promise.all(r.map(d => serve(app, lipthusRoutes + '/' + d, '/' + d, conf[d] && conf[d].userlevel))))
			.then(() => fs.exists(customRoutes))
			.then(exists => exists && fs.readdir(customRoutes)
				.then(r => Promise.all(r.map(d => serve(app, customRoutes + '/' + d, '/' + d, conf[d] && conf[d].userlevel))))
			);
	},

	build(dir){
		return fs.exists(dir + '/.angular-cli.json')
			.then(exists => {
				if(!exists)
					return;
				
				const dist = dir + '/dist';
				
				return fs.exists(dist)
					.then(exists => {
						if(exists)
							return;
						
						console.info('Angular 2. Building ' + dir);
						
						return new Promise((ok, ko) =>
							exec('cd ' + dir + ' && ng build --prod', {maxBuffer: 1024 * 900}, err => err ? ko(err): ok())
						)
							.then(() => fs.exists(dist))
							.then(exists => {
								if(!exists)
									throw new Error('Could not build ' + dist);
							});
					});
			});
	}
};

module.exports = app => {
	return methods.build(app.get('dir'))
		.then(() => methods.serve(app));
};
