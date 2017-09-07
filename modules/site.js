"use strict";

const express = require('express');
const debug = require('debug')('site:site');
const events = require('events');
const Db = require('./db');
const auth = require('./auth');
const path = require('path');
const Config = require('./config');
const flash = require('connect-flash');
const bodyParser = require('body-parser');
const multipart = require('./multipart');
const cookieParser = require('cookie-parser');
const favicons = require('connect-favicons');
const errorHandler = require('./errorhandler');
const device = require('express-device');
const Subscriptor = require('./subscriptor');
const Notifier = require('./notifier');
const sitemap = require('./sitemap');
const updater = require('./updater');
const listen = require('./listen');
const multilang = require('./multilang');
const Mailer = require("./mailer");
const facebook = require("./facebook");
const csrf = require('csurf')({cookie: true});
const security = require('./security');
const session = require('./session');
const os = require('os');
const HtmlPage = require('./htmlpage');
const logger = require('./logger');
const notFoundMin = require('../routes/notfoundmin');
const fs = require('mz/fs');
const Ng = require('./ng2');

debug.log = console.log.bind(console);

process.env.GC_EXPOSE_MEM_LIMIT = process.env.GC_EXPOSE_MEM_LIMIT || 120000000;

class Site extends events.EventEmitter {
	constructor(dir) {
		super();

		this.dir = dir;
		this.cmsDir = path.dirname(__dirname);
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
				(!isNaN(process.argv[2]) && process.argv[2]) ||
				this.conf.port ||
				this.package.config.port ||
				process.env.npm_package_config_port;

		this.port = parseInt(process.env.port);

		this.tmpdir = os.tmpdir();

		if (this.tmpdir.substr(-1) !== '/')
			this.tmpdir += '/';

		//TODO: personalizar
		this.secret = 'euca ' + this.conf.db;

		this._hooks = {pre: {}, post: {}};
	}

	init(hooks) {
		hooks && Object.extend(this._hooks, hooks);

		this.createApp();

		this.mailer = new Mailer(this.conf.mail, this);

		return this.connect()
			.then(() => Config(this))
			.then(config => {
				this.config = config;
				this.protocol = config.protocol;
				this.externalProtocol = process.env.NODE_ENV !== 'development' ? config.external_protocol : 'http';
				this.staticHost = config.static_host ? this.externalProtocol + '://' + config.static_host : '';
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

				// Notifier
				Object.defineProperty(this, 'notifier', {value: new Notifier(this)});

				return updater.checkVersions(this);
			})
			.then(this.hooks.bind(this, 'pre', 'setupApp'))
			.then(this.setupApp.bind(this))
			.then(this.hooks.bind(this, 'post', 'setupApp'))
			.then(() => Ng.build(this.dir))
			.then(() => Ng.serve(this.app))
			.then(this.getPages.bind(this))
			.then(this.loadPlugins.bind(this))
			.then(() => new Subscriptor(this.app))
			.then(() => debug(this.key + ' ready'))
			.then(this.hooks.bind(this, 'pre', 'finish'))
			.then(this.finish.bind(this))
			.then(this.hooks.bind(this, 'post', 'finish'));
	}

	hooks(hook, method) {
		const fn = this._hooks[hook][method];

		if (!fn)
			return Promise.resolve();

		debug('site hook ' + hook + ' ' + method + ' ' + fn.name);

		return fn(this);
	}

	loadPlugins() {
		this.plugins = {};

		const plugins = this.package.config.plugins;
		const promises = [];

		if (plugins)
			Object.each(plugins, k => promises.push(require('cmjs-' + k)(this.app)));

		return Promise.all(promises)
			.then(r => {
				r.forEach(p => {
					this.plugins[p.key] = p;
					Object.defineProperty(this, p.key, {value: p})
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

				//para status 40x no disparamos error
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

		//jj - solución temporal hasta incluirlo en htmlPage
		if (this._lessVars)
			Object.extend(ret, this._lessVars);

		return ret;
	}

	mainUrl(lang, omitePort) {
		let ret = this.externalProtocol + ':' + this.langUrl(lang);

		if (!omitePort && !ret.match(/:/))
			ret += ':' + this.port;

		return ret;
	}

	connect() {
		this.dbconf = this.package.config.db || this.conf.db || {name: this};

		if (typeof this.dbconf === 'string')
			this.dbconf = {name: this.dbconf};

		this.dbs = {};

		return this.connectDB({
			name: this.dbconf.name,
			user: this.dbconf.user,
			pass: this.dbconf.pass,
			schemasDir: this.dir + '/schemas'
		})
			.then(db => {
				Object.defineProperty(this, 'db', {value: db});

				if (!this.conf.dbs)
					return;

				const promises = this.conf.dbs.map(db_ => this.connectDB(db_));

				return Promise.all(promises);
			}).catch(console.error.bind(console));
	}

	sendMail(opt, throwError) {
		this.mailer.ensureFrom(opt);

		return this.db.emaillog
			.create({email: opt})
			.then(email => {

				if (process.env.NODE_ENV !== 'production') {
					email.result = 'No se ha enviado este email a '
						+ opt.to
						+ ' por estar en modo desarrollo\n'
						+ this.mainUrl()
						+ '/email-log?id=' + email.id;

					debug(email.result);

					return Promise.resolve(email);
				}

				return this.mailer.send(opt)
					.then(result => email.set('result', result))
					.catch(err => email.set('error', err));
			})
			.then(email => email.save())
			.then(email => {
				this.emit('mailsent', email);

				if (throwError && email.error)
					throw email.error;

				return email;
			});
	}

	connectDB(p) {
		return new Promise((ok, ko) => {
			let params = {
				name: p.name || p.db,
				user: p.user || '',
				pass: p.pass || '',
				host: this.dbconf.host || 'localhost',
				schemasDir: p.schemasDir
			};

			if (!params.name)
				return ko('No db name provided');

			new Db(params, this)
				.on('ready', db => ok(this.dbs[p.name] = db))
				.on('error', ko);
		});
	}

	createApp() {
		let app = express();

		Object.defineProperty(this, 'app', {value: app});
		Object.defineProperty(app, 'site', {value: this});

		app
			.set('name', this.package.name)
			.set('dir', this.dir)
			.set('lipthusDir', this.cmsDir)
			.set('version', this.package.version)
			.set('x-powered-by', false)
			.set('csrf', csrf)
			.set('conf', this.conf);

		app.use((req, res, next) => {
			res.now = Date.now();

			if (global.gc && process.memoryUsage().rss > process.env.GC_EXPOSE_MEM_LIMIT)
				global.gc();

			//evita doble slash al principio de la ruta
			if (req.path.match(/^\/\//))
				return res.redirect(req.path.substr(1));

			Object.defineProperties(req, {
				site: {value: this},
				db: {value: this.db}
			});

			req.cmsDir = this.cmsDir;
			req.domainName = (req.hostname || req.get('host')).replace(/^.+\.([^.]+\.[^.]+)$/, '$1');
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

			/** @deprecated */
			req.staticHost = this.staticHost;

			next();
		});

		app.getModule = app.eucaModule = name => require('./' + name);// to deprecate: eucaModule
		app.nodeModule = name => require(name);

		app.set('views', [this.dir + '/views', this.cmsDir + '/views']);
		app.set('view engine', 'pug');

		//Para usar paths absolutos en pug extends
		app.locals.basedir = '/';

		app.use(require('./logger-req'));
		app.use(require('../lib/canonicalhost'));
		app.use(favicons(this.dir + '/public/img/icons'));
		app.use(bodyParser.urlencoded({
			limit: '1gb',
			extended: true
		}));
		app.use(bodyParser.json({type: 'application/json', limit: '1gb'}));
		// asigna req.multipart()
		app.use(multipart);
		app.use(cookieParser());

		if (process.env.NODE_ENV === 'development') {
			app.locals.development = true;

			/** pug options
			 * @link https://pugjs.org/api/reference.html#options
			 * usamos las defaults
			 */
//			app.locals.pretty = true;//desactivado por distinto comportamiento del dom sin espacios
// 			app.locals.cache = false;
			// } else {
			// solución temporal. Pug no gestiona bien su propia caché. Pug version beta2
			// app.locals.cache = false;
		}

		const staticOpt = {
			maxAge: 31557600000,
			redirect: false
		};

		app.use('/s', express.static(this.dir + '/public', staticOpt));
		app.use('/cms', express.static(path.dirname(__dirname) + '/public', staticOpt));
		app.use('/pc', require('jj-proxy-cache'));
		app.use('/css', require('../lib/css'));
		app.use('/js', require('../lib/js'));
		app.use('/.well-known/acme-challenge', express.static("/etc/letsencrypt/webroot/.well-known/acme-challenge"));

		app.use(device.capture());
		device.enableDeviceHelpers(app);

		app.use(security.main);
	}

	setupApp() {
		const app = this.app;
		const production = app.get('env') === 'production';

		Object.defineProperties(app, {
			db: {value: this.db},
			dbs: {value: this.dbs}
		});

		Object.each(require('../configs/defaults'), (k, v) => app.set(k, v));

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
				app.use((req, res, next) => {
					if (req.ml && req.ml.lang && req.subdomains.length) {
						const luri = this.langUrl(req.ml.lang);

						if (luri.substr(2) !== req.headers.host && req.headers.host.indexOf(this.domainName) > 0)
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
					res.timer.end('cmjs');
					res.timer.start('page');
					next();
				});
			});
	}

	logo(width, height) {
		return this.config.sitelogo ? this.config.sitelogo.info(width || 340, height || 48) : {
			uri: '/cms/img/logo.png',
			width: 340,
			height: 48
		};
	}

	getPages() {
		if (this.pages)
			return Promise.resolve(this.pages);

		this.pages = {};

		return this.db.page
			.find({active: true})
			.then(r => {
				r.forEach(obj => this.pages[obj.key] = obj);

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
					router.all('/' + (p.url || p.key), (req, res, next) => p.display(req, res, next))
				);

				this.app.use('/', router);
			});
	}

	loadLocalRoutes() {
		const path = this.dir + '/routes';

		return fs.exists(path)
			.then(exists => exists && require(this.dir + '/routes')(this.app));
	}

	routeNotFound() {
		this.app.use((req, res) => {
			const min = !req.ml
				|| req.xhr
				|| req.device.type === 'bot'
				|| ['apple-touch-icon.png', 'favicon.ico'].indexOf(req.path.substr(1)) !== -1;

			if (!res.locals.LC)
				res.locals.LC = {};
			if (!res.statusCode || res.statusCode === 200)
				res.statusCode = 404;

			req.logger.logNotFound();

			res.htmlPage.triggerNotFound(res.statusCode, min);
		});
	}

	listen() {
		return new Promise(ok => {
			listen(this.app, r => {
				this.emit('listen', r);

				ok();
			});
		});
	}

	langUrl(langcode) {
		if (!this.langUrls)
			return '';

		if (langcode && this.langUrls[langcode])
			return this.langUrls[langcode];

		return this.langUrls[this.config.language];
	}

	translate(src, from, to, cb, srclog) {
		this.translator.translate(src, from, to, cb, srclog);
	}
}

module.exports = Site;