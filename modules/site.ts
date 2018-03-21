import {NextFunction} from "express";
import {EventEmitter} from "events";
import {Hooks} from "../interfaces/global.interface";
import * as Debug from "debug";
import {LipthusDb} from "./db";
import * as express from "express";
import * as path from "path";
import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as os from "os";
import * as device from "express-device";
import {checkVersions} from "./updater";
import {errorHandler} from "./errorhandler";
import * as csurf from "csurf";
import {session} from "./session";
import {LipthusRequest, LipthusResponse, LipthusApplication} from "../index";
import * as lipthus from '../index';
import {security} from "./security";
import {Config} from "./config";

const debug = Debug('site:site');
const auth = require('./auth');
const multipart = require('./multipart');
const Subscriptor = require('./subscriptor');
const Notifier = require('./notifier');
const sitemap = require('./sitemap');
const listen = require('./listen');
const multilang = require('./multilang');
const Mailer = require("./mailer");
const facebook = require("./facebook");
const csrf = csurf({cookie: true});
const HtmlPage = require('./htmlpage');
const logger = require('./logger');
const fs = require('mz/fs');
const Ng = require('./ng2');
const notFoundMin = require("../routes/notfoundmin");

// no se puede con import
const flash = require('connect-flash');
const favicons = require("connect-favicons");

debug.log = console.log.bind(console);

process.env.GC_EXPOSE_MEM_LIMIT = process.env.GC_EXPOSE_MEM_LIMIT || "120000000";

export class Site extends EventEmitter {
	
	public lipthusDir: string;
	public lipthusBuildDir: string;
	public package: any;
	public cmsPackage: any;
	public conf: any;
	public key: string;
	public port: number;
	public tmpdir: string;
	public secret: string;
	public mailer: any;
	public config: Config;
	public protocol = 'http';
	public externalProtocol = 'https';
	public staticHost = '';
	public domainName = '';
	public db: LipthusDb;
	public app: LipthusApplication;
	public pages: any = {};
	public plugins: any = {};
	public _lessVars: any;
	public dbconf: any;
	public dbs: any = {};
	public langUrls: any;
	public translator: any;
	public store?: any;
	public registerMethods: any = {};
	private _notifier: any;
	
	/**
	 * @deprecated
	 */
	public cmsDir: string;
	
	constructor(public dir: string, private _hooks: Hooks = {pre: {}, post: {}}) {
		super();
		
		this.lipthusBuildDir = path.dirname(__dirname);
		this.lipthusDir = path.basename(this.lipthusBuildDir) === 'dist' ? path.dirname(this.lipthusBuildDir) : this.lipthusBuildDir;
		// noinspection JSDeprecatedSymbols
		this.cmsDir = this.lipthusDir;
		this.package = require(dir + '/package');
		this.cmsPackage = require('../package');
		
		if (!this.package.config)
			this.package.config = {};
		
		try {
			this.conf = require(dir + '/custom-conf');
		} catch (e) {
			try {
				this.conf = require(dir + '/conf');
			} catch (e) {
				this.conf = {};
			}
		}
		
		this.key = this.package.name;
		
		if (!process.env.port)
			process.env.port =
				(!isNaN(+process.argv[2]) && process.argv[2]) ||
				this.conf.port ||
				this.package.config.port ||
				process.env.npm_package_config_port;
		
		this.port = parseInt('' + process.env.port, 10);
		
		this.tmpdir = os.tmpdir();
		
		if (this.tmpdir.substr(-1) !== '/')
			this.tmpdir += '/';
		
		// TODO: personalizar
		this.secret = 'euca ' + this.conf.db;
		
		this.app = express() as any;
		
		this.db = new LipthusDb(this.dbParams(), this);
		this.dbs[this.db.name] = this.db;
		
		this.config = new Config(this);
		
		this.connect();
	}
	
	connect() {
		this.db
			.on('error', this.emit.bind(this, 'error'))
			.on('ready', (db: LipthusDb) => {
				db.addLipthusSchemas()
					.then(() => this.db.addSchemasDir(this.dir + '/schemas'))
					.then(() => this.init())
					.catch(this.emit.bind(this, 'error'));
			})
			.connect();
	}
	
	addDb(p: any, schemasDir?: string): Promise<LipthusDb> {
		return new Promise((ok, ko) => {
			this.dbs[p.name] = new LipthusDb(p, this)
				.on('error', ko)
				.on('ready', (db: LipthusDb) => {
					db.addLipthusSchemas()
						.then(() => schemasDir && db.addSchemasDir(schemasDir))
						.then(() => ok(db), ko);
				});
			
			this.dbs[p.name].connect();
		});
	}
	
	init() {
		this.createApp();
		
		this.mailer = new Mailer(this.conf.mail, this);
		
		this.config.load()
			.then((config: Config) => {
				this.config = config;
				this.protocol = config.protocol;
				this.externalProtocol = process.env.NODE_ENV !== 'development' ? config.external_protocol : 'http';
				
				if (config.static_host)
					this.staticHost = this.externalProtocol + '://' + config.static_host;
				
				this.domainName = config.host;
				
				if (!config.port) {
					this.port = this.port || 3000;
					
					this.db.config
						.changeValue('port', this.port)
						.catch(console.error.bind(console));
				} else if (!this.port) {
					this.port = config.port;
				}
				
				if (!this.domainName) {
					this.domainName = 'localhost:' + this.port;
					
					this.db.config
						.changeValue('host', this.domainName)
						.catch(console.error.bind(console));
				}
				
				this.registerMethods = {
					site: config.site_credentials,
					google: config.googleApiKey && !!config.googleSecret,
					facebook: !!config.fb_app_id
				};
				
				return checkVersions(this);
			})
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
	
	get notifier () {
		if (!this._notifier)
			this._notifier = new Notifier(this);
		
		return this._notifier;
	}
	
	hooks(hook: string, method: string) {
		const fn = (this._hooks as any)[hook][method];
		
		if (!fn)
			return Promise.resolve();
		
		debug('site hook ' + hook + ' ' + method + ' ' + fn.name);
		
		return fn(this);
	}
	
	loadPlugins() {
		const plugins = this.package.config.plugins;
		const pr: Array<any> = [];
		
		if (plugins)
			Object.each(plugins, k => pr.push(require(this.dir + '/node_modules/cmjs-' + k)(this.app)));
		
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
				this.app.use(notFoundMin);
				
				return this.listen();
			});
	}
	
	lessVars() {
		let ret;
		
		try {
			ret = require(this.dir + '/public/css/vars');
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
		
		if (!omitePort && !ret.match(/:/))
			ret += ':' + this.port;
		
		return ret;
	}
	
	dbParams() {
		this.dbconf = this.package.config.db || this.conf.db || {name: this.key};
		
		if (typeof this.dbconf === 'string')
			this.dbconf = {name: this.dbconf};
		
		return {
			name: this.dbconf.name,
			user: this.dbconf.user,
			pass: this.dbconf.pass,
			host: this.dbconf.host || 'localhost'
		};
	}
	
	sendMail(opt: any, throwError?: boolean) {
		return this.db.emaillog
			.create({email: opt})
			.then((email: any) => {
				if (process.env.NODE_ENV !== 'production') {
					// this.mailer.checkOptions(opt);
					
					// email.email.attachments = opt.attachments;
					
					email.result = 'No se ha enviado este email a '
						+ opt.to
						+ ' por estar en modo desarrollo\n'
						+ this.mainUrl()
						+ '/email-log?id=' + email.id;
					
					debug(email.result);
					
					return email;
				}
				
				return this.mailer.send(opt)
					.then((result: any) => email.set('result', result))
					.catch((err: Error) => email.set('error', err));
			})
			.then((email: any) => email.save())
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
			.set('lipthusDir', this.lipthusDir)
			.set('version', this.package.version)
			.set('x-powered-by', false)
			.set('csrf', csrf)
			.set('conf', this.conf);
		
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
			
			res.set('X-Powered-By', 'Eucalipthus');
			
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
		app.getModule = (name: string) => lipthus[name] || require('./' + name);
		// noinspection JSDeprecatedSymbols
		app.nodeModule = (name: string) => require(name);
		
		app.set('views', [this.dir + '/views', this.lipthusDir + '/views']);
		app.set('view engine', 'pug');
		
		// Para usar paths absolutos en pug extends
		app.locals.basedir = '/';
		
		app.use(require('./logger-req'));
		app.use(require('../lib/canonicalhost'));
		app.use(favicons(this.dir + '/public/img/icons'));
		
		if (process.env.NODE_ENV === 'development') {
			app.locals.development = true;
		}
		
		const staticOpt = {
			maxAge: 31557600000,
			redirect: false
		};
		
		app.use('/s', express.static(this.dir + '/public', staticOpt));
		app.use('/cms', express.static(this.lipthusDir + '/public', staticOpt));
		app.use('/pc', require('jj-proxy-cache'));
		app.use('/css', require('../lib/css'));
		app.use('/js', require('../lib/js'));
		app.use('/.well-known/acme-challenge', express.static("/etc/letsencrypt/webroot/.well-known/acme-challenge"));
		
		app.use(device.capture());
		device.enableDeviceHelpers(app);
		
		app.use(bodyParser.urlencoded({
			limit: '1gb',
			extended: true
		}));
		app.use(bodyParser.json({type: 'application/json', limit: '1gb'}));
		// asigna req.multipart()
		app.use(multipart);
		app.use(cookieParser());
		
		app.use(security.main);
	}
	
	setupApp() {
		const app = this.app;
		const production = app.get('env') === 'production';
		
		Object.defineProperties(app, {
			db: {value: this.db},
			dbs: {value: this.dbs}
		});
		
		Object.each(require(this.lipthusDir + '/configs/defaults'), (k, v) => app.set(k, v));
		
		if (production)
			app.enable('socket');
		else
			app.set('port', this.port);
		
		app.set('protocol', this.protocol);
		app.set('externalProtocol', this.externalProtocol);
		
		app.use(security.spamBlocker);
		app.use(require('./g-page-speed'));
		app.use(require('./client')(app));
		
		app.locals.sitename = this.config.sitename;
		
		return multilang(app)
			.then(() => {
				app.use((req: LipthusRequest, res: LipthusResponse, next: NextFunction) => {
					if (req.ml && req.ml.lang && req.subdomains.length) {
						const luri = this.langUrl(req.ml.lang);
						
						if (luri.substr(2) !== req.headers.host && (req.headers.host || '').indexOf(this.domainName) > 0)
							return res.redirect(this.externalProtocol + ':' + luri + req.url);
					}
					
					next();
				});
				app.use('/', require('./cookielaw'));
				app.use(flash());
				app.use(HtmlPage.middleware);
				app.use(session(this));
				logger.init(app);
				app.use(require('./cmjspanel'));
				app.use(sitemap(this));
				facebook(app);
				app.use(auth(this));
				
				if ('production' === app.get('env') && this.conf.cache)
					app.use(require('./cache')(this.conf.cache));
				
				app.use((req, res, next) => {
					(res as any).timer.end('cmjs');
					(res as any).timer.start('page');
					next();
				});
			});
	}
	
	logo(width: number, height: number) {
		if (this.config.sitelogo)
			return this.config.sitelogo!.info(width || 340, height || 48);
		
		return {
			uri: '/cms/img/logo.png',
			width: 340,
			height: 48
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
				const router = express.Router({strict: true});
				
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
		
		return fs.exists(path_)
			.then((exists: boolean) => exists && require(path_)(this.app));
	}
	
	routeNotFound() {
		this.app.use((req: LipthusRequest, res) => {
			const min = !req.ml
				|| req.xhr
				|| req.device.type === 'bot'
				|| ['apple-touch-icon.png', 'favicon.ico'].indexOf(req.path.substr(1)) !== -1;
			
			if (!res.locals.LC)
				res.locals.LC = {};
			if (!res.statusCode || res.statusCode === 200)
				res.statusCode = 404;
			
			req.logger.logNotFound();
			
			(res as any).htmlPage.triggerNotFound(res.statusCode, min);
		});
	}
	
	listen() {
		return new Promise(ok => {
			listen(this.app, (r: any) => {
				this.emit('listen', r);
				
				ok();
			});
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
