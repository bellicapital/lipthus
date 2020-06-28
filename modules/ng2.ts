import * as fs from "fs";
import {LipthusApplication, LipthusRequest, LipthusResponse} from "../index";
import {NextFunction} from "express";
import {promisify} from "util";

const pReadFile = promisify(fs.readFile);
const pReadDir = promisify(fs.readdir);

class Ng2helper {

	public indexFile = '';
	public fFound: Array<string> = [];
	public notFFound: Array<string> = [];

	static serve(app: LipthusApplication, dir: string, route: string, userLevel?: number, routes?: Array<string>) {
		return new Ng2helper(app, dir, route, userLevel, routes).serveIfBuild();
	}

	constructor(public app: LipthusApplication, public dir: string, public route: string, public userLevel = 0, public routes: Array<string> = ['/']) {
	}

	serveIfBuild(): Promise<any> {
		if (fs.existsSync(this.dir))
			return this.doServe();
	}

	async doServe(): Promise<any> {
		const raw = await pReadFile(this.dir + '/index.html', 'utf8');
		this.indexFile = raw.replace(/base href="\/"/, 'base href="' + this.route + '/"');
		this.app.use(this.route, this.middleware.bind(this));
	}

	middleware(req: LipthusRequest, res: LipthusResponse, next: NextFunction) {
		this.checkUserLevel(req)
			.then(ok => {
				if (!ok) {
					let url = '/login/?referrer=' + encodeURIComponent(this.route);

					if (req.user)
						url += '&msg=No tienes acceso a esta sección';

					return res.redirect(url);
				}

				if (req.path === '/' || this.routes.indexOf(req.path) !== -1 || this.notFFound.indexOf(req.path) !== -1)
					return res.send(this.indexFile);

				const file = this.dir + req.path;

				if (this.fFound.indexOf(req.path) !== -1)
					return res.sendFile(file);

				return pExists(file)
					.then(exists => {
						if (exists) {
							this.fFound.push(req.path);

							return res.sendFile(file);
						} else {
							this.notFFound.push(req.path);

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
}


const methods = {

	async serve(app: LipthusApplication): Promise<void> {
		const dir = app.get('srcDir');
		const lipthusRoutes = app.get('lipthusDir') + '/ng-routes';
		const serve = Ng2helper.serve;
		const conf = app.site.package.config.ngRoutes || {};
		const customRoutes = dir + '/ng-routes';

		if (fs.existsSync(dir + '/angular-cli.json'))
			await Ng2helper.serve(app, dir, '/home');

		const r = await pReadDir(lipthusRoutes);
		await Promise.all(r.map((d: string) => serve(app, lipthusRoutes + '/' + d, '/' + d, conf[d] && conf[d].userlevel)));

		if (fs.existsSync(customRoutes)) {
			const r2: Array<string> = await pReadDir(customRoutes);
			await Promise.all(r2.map((d: string) => serve(app, customRoutes + '/' + d, '/' + d, conf[d] && conf[d].userlevel)));
		}
	}
};

const pExists = (file: string): Promise<boolean> => {
	return Promise.resolve(fs.existsSync(file));
};

export default (app: LipthusApplication): Promise<void> => {
	return methods.serve(app);
};
