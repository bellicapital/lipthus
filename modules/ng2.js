"use strict";

const Login = require('lipthus-login');
const Setup = require('lipthus-setup');
const ng2 = require('lipthus-ng2');
const fs = require('mz/fs');
const path = require('path');


module.exports = {
	serve(app){
		const dir = app.get('dir');
		const customRoutes = dir + '/ng-routes';
		const serve = ng2.serve;

		return Login(app, serve)
			.then(() => Setup(app, serve))
			.then(() => fs.exists(dir + '/.angular-cli.json'))
			.then(exists => exists && serve(app, dir, '/home'))
			.then(() => fs.exists(customRoutes))
			.then(exists => exists && fs.readdir(customRoutes)
				.then(r => Promise.all(r.map(d => serve(app, customRoutes + '/' + d, '/' + d))))
			);
	},

	build(dir){
		const customRoutes = dir + '/ng-routes';
		const build = ng2.build;

		return build(path.dirname(require.resolve('lipthus-login')))
			.then(() => build(path.dirname(require.resolve('lipthus-setup'))))
			.then(() => fs.exists(dir + '/.angular-cli.json'))
			.then(exists => exists && build(dir))
			.then(() => fs.exists(customRoutes))
			.then(exists => exists && fs.readdir(customRoutes)
				.then(r => Promise.all(r.map(d => build(customRoutes + '/' + d))))
			);
	}
};