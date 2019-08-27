import {NextFunction, Router} from "express";
import {EventEmitter} from "events";
import {DbParams, EnvironmentParams, Hooks, KeyAny, KeyString, LipthusConnection} from "../interfaces/global.interface";
import * as Debug from "debug";
import {LipthusDb} from "./db";
import * as express from "express";
import * as path from "path";
import {urlencoded} from "body-parser";
import * as cookieParser from "cookie-parser";
import * as os from "os";
import {checkVersions} from "./updater";
import {errorHandler} from "./errorhandler";
import * as csurf from "csurf";
import session from "./session";
import {LipthusRequest, LipthusResponse, LipthusApplication, UserModel, LipthusPage} from "../index";
import * as lipthus from '../index';
import {security} from "./security";
import {Config} from "./config";
import {LipthusLogger} from "./logger";
import '../lib/global.l';
import notFoundMin from "../routes/notfoundmin";
import {MultilangModule} from "./multilang";
import {HtmlPageMiddleware} from "./htmlpage";
import logger_req from "./logger-req";
import auth from "./auth";
import {exists as exists_, existsSync} from "fs";
import {promisify} from "util";
import listen from "./listen";
import sitemap from "./sitemap";
import {Notifier} from "./notifier";
import multipart from './multipart';
import {Subscriptor} from './subscriptor';
import {Mailer} from "./mailer";
import facebook from "./facebook";
import Ng from './ng2';
import {GPageSpeedMiddleWare} from "./g-page-speed";
import {LipthusDevPanel} from "./cmjspanel";

const pExists = promisify(exists_);
const debug = Debug('site:site');
const device = require('express-device');
const csrf = csurf({cookie: true});
// no se puede con import
const flash = require('connect-flash');
const favicon = require("connect-favicons");

export class Site extends EventEmitter {

	public srcDir: string;	// dir outside the site dist directory if started from the tsc compiled dir
	public lipthusDir: string;
	public lipthusBuildDir = path.dirname(__dirname);
	public package: any;
	public cmsPackage: any;
	public key: string;
	public tmpDir: string;
	public secret: string;
	public mailer: any;
	public config: Config;
	public protocol: string;
	public externalProtocol: string;
	public staticHost = '';
	public domainName: string;
	public db: LipthusDb;
	public app: LipthusApplication;
	public pages: { [s: string]: LipthusPage; } = {};
	public plugins: any = {};
	public _lessVars: any;
	public dbconf: DbParams;
	public dbs: { [s: string]: LipthusDb } = {};
	public langUrls!: { [s: string]: string };
	public translator: any;
	public store?: any;
	public registerMethods: any = {};
	public environment: EnvironmentParams;
	public langs: KeyString = {};
	public availableLangs: KeyAny = {};
	public availableTanslatorLangs: KeyAny = {};
	public sitemap?: any;
	private _notifier: any;
	private _userCol?: UserModel;
	private _authDb: any;
	private _hooks: Hooks = {pre: {}, post: {}};

	/**
	 * @deprecated
	 */
	public cmsDir: string;

	constructor(public dir: string, public options: SiteOptions = {}) {
		super();

		this.srcDir = path.basename(dir) === 'dist' ? path.dirname(dir) : dir;

		if (this.options.pre)
			this._hooks.pre = this.options.pre;

		if (this.options.post)
			this._hooks.post = this.options.post;

		this.lipthusDir = path.basename(this.lipthusBuildDir) === 'dist' ? path.dirname(this.lipthusBuildDir) : this.lipthusBuildDir;
		// noinspection JSDeprecatedSymbols
		this.cmsDir = this.lipthusDir;
		this.package = require(this.srcDir + '/package');
		this.cmsPackage = require('../package');

		if (!this.package.config)
			this.package.config = {};

		this.key = this.package.name;
		this.tmpDir = os.tmpdir();

		if (this.tmpDir.substr(-1) !== '/')
			this.tmpDir += '/';

		this.app = express() as any;

		this.environment = this.getEnvironment();
		this.domainName = this.environment.domain;
		this.protocol = this.environment.protocol || 'http';
		this.externalProtocol = this.environment.externalProtocol || 'https';
		this.dbconf = this.environment.db || {name: this.key};
		this.db = new LipthusDb(this.dbconf, this);
		this.dbs[this.db.name] = this.db;
		this.secret = 'lipthus ' + this.dbconf.name;

		this.config = new Config(this);

		this.connect();
	}

	getEnvironment(): EnvironmentParams {
		if (process.env.LIPTHUS_ENV)
			return require(this.dir + '/environments/' + process.env.LIPTHUS_ENV).environment;

		if (existsSync(this.srcDir + '/custom-conf.json')) {
			const ret = require(this.srcDir + '/custom-conf');

			return ret.include ? require(this.srcDir + '/' + ret.include) : ret;
		}

		let file = this.dir + '/environments/environment';

		if (process.env.NODE_ENV === 'production')
			file += '.prod';
		else if (process.env.NODE_ENV === 'staging')
			file += '.staging';

		console.log('Loading environment', file);

		return require(file).environment;
	}

	connect() {
		this.db
			.on('error', this.emit.bind(this, 'error'))
			.on('ready', (db: LipthusDb) => {
				db.addLipthusSchemas()
					.then(() => existsSync(this.dir + '/schemas') && this.db.addSchemasDir(this.dir + '/schemas'))
					.then(() => this.init())
					.catch(this.emit.bind(this, 'error'));
			});

		this.db.connect();
	}

	// noinspection JSUnusedGlobalSymbols
	addDb(name: string | any, schemasDir?: string): Promise<LipthusDb> {
		// old compat
		if (typeof name !== 'string')
			name = name.name;

		const db = new LipthusDb({name: name}, this);

		db._conn = <LipthusConnection> Object.assign(this.db._conn.useDb(name), {
			lipthusDb: db,
			site: this,
			app: this.app
		});

		this.dbs[name] = db;

		db.setFs();

		return db.addLipthusSchemas()
			.then(() => schemasDir && db.addSchemasDir(schemasDir))
			.then(() => db);
	}

	// noinspection JSUnusedGlobalSymbols
	addDb_old(p: any, schemasDir?: string): Promise<LipthusDb> {
		return new Promise((ok, ko) => {
			const db = new LipthusDb(p, this);

			db.on('error', ko)
				.on('ready', () => {
					this.dbs[p.name] = db;

					db.addLipthusSchemas()
						.then(() => schemasDir && db.addSchemasDir(schemasDir))
						.then(() => ok(db), ko);
				});

			db.connect();
		});
	}

	init() {
		this.createApp();

		this.mailer = new Mailer(this.environment.mail, this);

		return this.config.load()
			.then(() => {
				const config = this.config;

				if (config.static_host)
					this.staticHost = this.externalProtocol + '://' + config.static_host;

				this.registerMethods = {
					site: config.site_credentials,
					google: config.googleApiKey && !!config.googleSecret,
					facebook: !!config.fb_app_id
				};
			})
			.then(this.hooks.bind(this, 'pre', 'checkVersion'))
			.then(checkVersions.bind(this, this))
			.then(this.hooks.bind(this, 'pre', 'setupApp'))
			.then(this.setupApp.bind(this))
			.then(this.hooks.bind(this, 'post', 'setupApp'))
			.then(() => Ng(this.app))
			.then(this.getPages.bind(this))
			.then(this.loadPlugins.bind(this))
			.then(this.hooks.bind(this, 'post', 'plugins'))
			.then(() => new Subscriptor(this.app))
			.then(() => debug(this.key + ' ready'))
			.then(this.hooks.bind(this, 'pre', 'finish'))
			.then(this.finish.bind(this))
			.then(this.hooks.bind(this, 'post', 'finish'))
			.then(() => this.emit('ready'));
	}

	get notifier() {
		if (!this._notifier)
			this._notifier = new Notifier(this);

		return this._notifier;
	}

	get authDb(): LipthusDb {
		if (!this._authDb)
			this._authDb = this.environment.authDb ? this.dbs[this.environment.authDb] : this.db;

		return this._authDb;
	}

	get userCollection(): UserModel {
		if (!this._userCol) {
			this.db.models.user = this.authDb.model('user');

			this._userCol = this.db.user;
		}

		return this._userCol;
	}

	hooks(hook: string, method: string) {
		const hooks = (this._hooks as any);

		if (!hooks[hook])
			hooks[hook] = {};

		const fn = hooks[hook][method];

		if (!fn)
			return Promise.resolve();

		debug('site hook ' + hook + ' ' + method + ' ' + fn.name);

		return fn(this);
	}

	loadPlugins() {
		const plugins = this.package.config.plugins;
		const pr: Array<any> = [];

		if (plugins)
			Object.each(plugins, k => pr.push(require(this.srcDir + '/node_modules/cmjs-' + k)(this.app)));

		return Promise.all(pr)
			.then(r => {
				r.forEach(p => {
					this.plugins[p.key] = p;
					Object.defineProperty(this, p.key, {value: p});
				});
			});
	}

	toString() {
		return this.config && this.config.sitename || this.key;
	}

	finish() {
		return this.setRoutes()
			.then(() => {
				this.routeNotFound();

				this.app.use(errorHandler);

				// para status 40x no disparamos error
				this.app.use(notFoundMin as any);

				if (!this.options.skipListening)
					return this.listen();
				else
					debug('Skip listening');
			});
	}

	lessVars() {
		let ret;

		try {
			ret = require(this.srcDir + '/public/css/vars');
		} catch (e) {
			ret = {};
		}

		if (!ret.images)
			ret.images = "\"" + this.staticHost + "/s/img\"";

		if (!ret.staticHost)
			ret.staticHost = "\"" + this.staticHost + "\"";

		if (!ret.optimg)
			ret.optimg = "\"" + this.staticHost + "/optimg\"";

		// jj - solución temporal hasta incluirlo en htmlPage
		if (this._lessVars)
			Object.assign(ret, this._lessVars);

		return ret;
	}

	mainUrl(lang?: string, omitePort?: boolean) {
		let ret = this.externalProtocol + ':' + this.langUrl(lang);

		if (!omitePort && this.environment.port && !ret.match(/:/))
			ret += ':' + this.environment.port;

		return ret;
	}

	sendMail(opt: any, throwError?: boolean) {
		return this.db.mailsent
			.create({email: opt})
			.then((email: any) => email.send())
			.then((email: any) => {
				this.emit('mailsent', email);

				if (throwError && email.error)
					throw email.error;

				return email;
			});
	}

	createApp() {
		const app = this.app;

		Object.defineProperty(this, 'app', {value: app});
		Object.defineProperty(app, 'site', {value: this});

		app
			.set('name', this.package.name)
			.set('dir', this.dir)
			.set('srcDir', this.srcDir)
			.set('lipthusDir', this.lipthusDir)
			.set('version', this.package.version)
			.set('x-powered-by', false)
			.set('csrf', csrf)
			.set('environment', this.environment)
			.set('tmpDir', this.tmpDir);

		app.use((req: LipthusRequest, res: LipthusResponse, next: NextFunction) => {
			if (req.url === '/__test__')
				return res.send('Connection: ' + this.db.connected);

			if (!this.db.connected)
				throw new Error('No db connection');

			res.now = Date.now();

			if (global.gc && process.memoryUsage().rss > (process.env.GC_EXPOSE_MEM_LIMIT || 0))
				global.gc();

			// evita doble slash al principio de la ruta
			if (req.path.match(/^\/\//))
				return res.redirect(req.path.substr(1));

			Object.defineProperties(req, {
				site: {value: this},
				db: {value: this.db}
			});

			// noinspection JSDeprecatedSymbols
			req.cmsDir = this.lipthusDir;
			req.domainName = (req.hostname || req.get('host') || '').replace(/^.+\.([^.]+\.[^.]+)$/, '$1');
			req.fullUri = req.protocol + '://' + req.headers.host + req.originalUrl;

			res.set('X-Powered-By', 'Lipthus');

			req.notifyError = err => {
				err.url = req.fullUri;
				err.referer = req.get('referer');
				err.title = 'Problem with a ' + req.method + ' request';

				if (req.method === 'POST')
					err.title += ".\nBody: " + JSON.stringify(req.body, null, '\t').substr(0, 900);

				if (err.referer)
					err.title += "\nReferer: " + err.referer + "\n";

				if (process.env.NODE_ENV !== 'production')
					return;

				this.sendMail({
					from: "server ✔ <no_responder@" + req.hostname.replace(/^.*\.(\w+\.\w+)$/, '$1') + ">",
					to: this.config.webmastermail,
					subject: 'New error in ' + this.key, // Subject line
					text: err.url + '\n'
						+ err.title + '\n'
						+ err.stack
				})
					.catch(console.error.bind(console));
			};

			res.locals.location = {
				host: req.headers.host,
				protocol: req.protocol,
				href: req.protocol + '://' + req.headers.host + req.originalUrl,
				hostname: req.hostname,
				pathname: req.path
			};

			if (req.headers.referer)
				res.locals.location.origin = req.headers.referer;

			if (Object.keys(req.query).length)
				res.locals.location.search = req.originalUrl.replace(/^[^?]+/, '');

			// first time from browser & not defined
			if (!this.staticHost)
				this.staticHost = req.protocol + '://' + (this.config.static_host || req.headers.host);

			res.locals.staticHost = this.staticHost;

			next();
		});

		// noinspection JSDeprecatedSymbols
		app.getModule = (name: string) => (lipthus as any)[name] || require('./' + name);
		// noinspection JSDeprecatedSymbols
		app.nodeModule = (name: string) => require(name);

		app.set('views', [this.srcDir + '/views', this.lipthusDir + '/views']);
		app.set('view engine', 'pug');

		// Para usar paths absolutos en pug extends
		app.locals.basedir = '/';

		app.use(logger_req);
		app.use(favicon(this.srcDir + '/public/img/icons'));

		if (process.env.NODE_ENV === 'development') {
			app.locals.development = true;
		}

		const staticOpt = {
			maxAge: 31557600000,
			redirect: false
		};

		app.use('/s', express.static(this.srcDir + '/public', staticOpt));
		app.use('/cms', express.static(this.lipthusDir + '/public', staticOpt));
		app.use('/pc', require('jj-proxy-cache'));
		app.use('/css', require('../lib/css'));
		app.use('/js', require('../lib/js'));
		app.use('/.well-known/acme-challenge', express.static("/etc/letsencrypt/webroot/.well-known/acme-challenge"));

		// noinspection TypeScriptValidateJSTypes
		app.use(device.capture());
		device.enableDeviceHelpers(app);

		app.use(urlencoded({
			limit: '1gb',
			extended: true
		}));
		app.use(express.json({limit: '1gb'}));
		app.use(multipart);
		app.use(cookieParser());

		app.use(security.main);
	}

	setupApp() {
		const app = this.app;

		Object.defineProperties(app, {
			db: {value: this.db},
			dbs: {value: this.dbs}
		});

		Object.each(require(this.lipthusDir + '/configs/defaults'), (k, v) => app.set(k, v));

		app.set('protocol', this.protocol);
		app.set('externalProtocol', this.externalProtocol);

		app.use(GPageSpeedMiddleWare);
		app.use(require('./client')(app));

		app.locals.sitename = this.config.sitename;

		return MultilangModule(app)
			.then(() => {
				app.use(flash());
				app.use(HtmlPageMiddleware);
				app.use(session(this));
				LipthusLogger.init(app);
				app.use(LipthusDevPanel);

				if (!this.environment.customSitemap)
					app.use(sitemap(this));

				facebook(app);
				app.use(auth(this));

				app.use((req: LipthusRequest, res: any, next: NextFunction) => {
					res.timer.end('cmjs');
					res.timer.start('page');
					next();
				});
			});
	}

	logo(width = 340, height = 48) {
		if (this.config.sitelogo)
			return this.config.sitelogo!.info(width, height);

		return {
			uri: '/cms/img/logo.png',
			width: width,
			height: height
		};
	}

	getPages() {
		if (Object.keys(this.pages).length)
			return Promise.resolve(this.pages);

		return this.db.page
			.find({active: true})
			.then((r: Array<any>) => {
				r.forEach((obj: any) => this.pages[obj.key] = obj);

				return this.pages;
			});
	}

	setRoutes() {
		require('../routes')(this.app);

		return this.loadLocalRoutes()
			.then(() => {
				const router = Router({strict: true});

				if (this.config.startpage && this.pages[this.config.startpage])
					router.all('/', (req, res, next) => this.pages[this.config.startpage].display(req, res, next));

				Object.values(this.pages).forEach(p =>
					router.all('/' + (p.url || p.key), p.display.bind(p))
				);

				this.app.use('/', router);
			});
	}

	loadLocalRoutes() {
		const path_ = this.dir + '/routes';

		return pExists(path_)
			.then((exists: boolean) => exists && require(path_)(this.app));
	}

	routeNotFound() {
		this.app.use((req: LipthusRequest, res: LipthusResponse) => {
			const min = !req.ml
				|| req.xhr
				|| req.device.type === 'bot'
				|| ['apple-touch-icon.png', 'favicon.ico'].indexOf(req.path.substr(1)) !== -1;

			if (!res.locals.LC)
				res.locals.LC = {};
			if (!res.statusCode || res.statusCode === 200)
				res.statusCode = 404;

			req.logger.logNotFound().then();

			(res as any).htmlPage.triggerNotFound(res.statusCode, min);
		});
	}

	listen() {
		return listen(this.app)
			.then((r: any) => {
				this.emit('listen', r);
			});
	}

	langUrl(langcode?: string) {
		if (!this.langUrls)
			return '';

		if (langcode && this.langUrls[langcode])
			return this.langUrls[langcode];

		return this.langUrls[this.config.language];
	}

	translate(src: string, from: string, to: string, cb: (err: Error, r: any) => void, srclog: string) {
		this.translator.translate(src, from, to, cb, srclog);
	}
}

export interface SiteOptions {
	pre?: {
		checkVersion?: any;
		setupApp?: any;
		finish?: any;
	};
	post?: {
		setupApp?: any;
		plugins?: any;
		finish?: any;
	};
	skipListening?: boolean;
}
