"use strict";

const Login = require('lipthus-login');
const Setup = require('lipthus-setup');
const ng2 = require('lipthus-ng2');
const fs = require('mz/fs');


module.exports = {
	init(app){
		const dir = app.get('dir');
		const customRoutes = dir + '/ng-routes';

		return Login(app, ng2)
			.then(() => Setup(app, ng2))
			.then(() => fs.exists(dir + '/.angular-cli.json'))
			.then(exists => exists && ng2(app, dir, '/home'))
			.then(() => fs.exists(customRoutes))
			.then(exists => {
				if(!exists)
					return;

				return fs.readdir(customRoutes)
					.then(r => Promise.all(r.map(d => ng2(app, customRoutes + '/' + d, '/' + d))));
			});
	}
};