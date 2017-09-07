"use strict";

const ng2 = require('lipthus-ng2');
const fs = require('mz/fs');


module.exports = {
	serve(app){
		const dir = app.get('dir');
		const lipthusRoutes = app.get('lipthusDir') + '/ng-routes';
		const customRoutes = dir + '/ng-routes';
		const serve = ng2.serve;
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
			.then(exists => exists && ng2.build(dir));
	}
};