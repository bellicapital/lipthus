import * as fs from "fs";
import {LipthusApplication, LipthusRequest, LipthusResponse} from "../index";
import {NextFunction} from "express";
import {promisify} from "util";
import * as Debug from "debug";

const debug = Debug('site:site');

const pReadFile = promisify(fs.readFile);
const pReadDir = promisify(fs.readdir);
const exec = require('child_process').exec;

class Ng2helper {

	public indexFile = '';
	public ffound: Array<string> = [];
	public notffound: Array<string> = [];

	constructor(public app: LipthusApplication, public dir: string, public route: string, public userLevel = 0, public routes: Array<string> = ['/']) {

	}

	serveIfBuild(): Promise<any> {
		return pExists(this.dir)
			.then(exists => {
				if (exists)
					return this.doServe();
			});
	}

	doServe(): Promise<any> {
		return pReadFile(this.dir + '/index.html', 'utf8')
			.then(raw =>
				// modify base url & store index.html in indexCache
				this.indexFile = raw.replace(/base href="\/"/, 'base href="' + this.route + '/"')
			)
			.then(() => this.app.use(this.route, this.middelware.bind(this)));
	}

	middelware(req: LipthusRequest, res: LipthusResponse, next: NextFunction) {
		this.checkUserLevel(req)
			.then(ok => {
				if (!ok) {
					let url = '/login/?referrer=' + encodeURIComponent(this.route);

					if (req.user)
						url += '&msg=No tienes acceso a esta sección';

					return res.redirect(url);
				}

				if (req.path === '/' || this.routes.indexOf(req.path) !== -1 || this.notffound.indexOf(req.path) !== -1)
					return res.send(this.indexFile);

				const file = this.dir + req.path;

				if (this.ffound.indexOf(req.path) !== -1)
					return res.sendFile(file);

				return pExists(file)
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

	checkUserLevel(req: LipthusRequest): Promise<boolean> {
		if (!this.userLevel)
			return Promise.resolve(true);

		return req.getUser()
			.then(user => user && user.level >= this.userLevel);
	}

	static serve(app: LipthusApplication, dir: string, route: string, userLevel?: number, routes?: Array<string>) {
		return new Ng2helper(app, dir, route, userLevel, routes).serveIfBuild();
	}
}


const methods = {

	serve(app: LipthusApplication): Promise<void> {
		const dir = app.get('srcDir');
		const lipthusRoutes = app.get('lipthusDir') + '/ng-routes';
		const serve = Ng2helper.serve;
		const conf = app.site.package.config.ngRoutes || {};

		let customRoutes = dir + '/dist/ng-routes';
		customRoutes = dir + '/ng-routes';


		return pExists(dir + '/angular-cli.json')
			.then(exists => exists && serve(app, dir, '/home'))
			.then(() => pReadDir(lipthusRoutes))
			.then(r => Promise.all(r.map((d: string) => serve(app, lipthusRoutes + '/' + d, '/' + d, conf[d] && conf[d].userlevel))))
			.then(() => pExists(customRoutes))
			.then(exists => {
				if (!exists)
					return;

				return pReadDir(customRoutes)
					.then((r: Array<string>): Promise<any> => Promise.all(r.map((d: string) => serve(app, customRoutes + '/' + d, '/' + d, conf[d] && conf[d].userlevel))));
			});
	},

	build(dir: string) {
		return pExists(dir + '/.angular-cli.json')
			.then(exists => {
				if (!exists)
					return;

				const dist = dir + '/dist';

				return pExists(dist)
					.then(exists2 => {
						if (exists2)
							return;

						debug('Angular 2. Building ' + dir);

						return new Promise((ok, ko) =>
							exec('cd ' + dir + ' && ng build --prod', {maxBuffer: 1024 * 900}, (err?: Error) => err ? ko(err) : ok())
						)
							.then(() => pExists(dist))
							.then(exists3 => {
								if (!exists3)
									throw new Error('Could not build ' + dist);
							});
					});
			});
	}
};

const pExists = (file: string): Promise<boolean> => {
	return Promise.resolve(fs.existsSync(file));
};

export default (app: LipthusApplication): Promise<void> => {
	return methods.build(app.get('dir'))
		.then(() => methods.serve(app));
};
