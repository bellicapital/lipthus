"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const Debug = require("debug");
const db_1 = require("./db");
const express = require("express");
const path = require("path");
const body_parser_1 = require("body-parser");
const cookieParser = require("cookie-parser");
const os = require("os");
const updater_1 = require("./updater");
const errorhandler_1 = require("./errorhandler");
const csurf = require("csurf");
const lipthus = require("../index");
const security_1 = require("./security");
const config_1 = require("./config");
const logger_1 = require("./logger");
const notfoundmin_1 = require("../routes/notfoundmin");
const multilang_1 = require("./multilang");
const htmlpage_1 = require("./htmlpage");
const logger_req_1 = require("./logger-req");
const fs_1 = require("fs");
const listen_1 = require("./listen");
const notifier_1 = require("./notifier");
const multipart_1 = require("./multipart");
const subscriber_1 = require("./subscriber");
const mailer_1 = require("./mailer");
const ng2_1 = require("./ng2");
const g_page_speed_1 = require("./g-page-speed");
const routes_1 = require("../routes");
const debug = Debug('site:site');
const device = require('express-device');
const csrf = csurf({ cookie: true });
const favicon = require("connect-favicons");
class Site extends events_1.EventEmitter {
    constructor(dir, options = {}) {
        super();
        this.dir = dir;
        this.options = options;
        this.lipthusBuildDir = path.dirname(__dirname);
        this.staticHost = '';
        this.plugins = {};
        this.dbs = {};
        this.registerMethods = {};
        this.langs = {};
        this.availableLangs = {};
        this.availableTranslatorLangs = {};
        this._hooks = { pre: {}, post: {} };
        this.srcDir = path.basename(dir) === 'dist' ? path.dirname(dir) : dir;
        if (this.options.pre)
            this._hooks.pre = this.options.pre;
        if (this.options.post)
            this._hooks.post = this.options.post;
        this.lipthusDir = path.basename(this.lipthusBuildDir) === 'dist' ? path.dirname(this.lipthusBuildDir) : this.lipthusBuildDir;
        // noinspection JSDeprecatedSymbols
        this.cmsDir = this.lipthusDir;
        this.package = require(this.srcDir + '/package');
        this.cmsPackage = require(this.lipthusDir + '/package');
        if (!this.package.config)
            this.package.config = {};
        this.key = this.package.name;
        this.tmpDir = os.tmpdir();
        if (this.tmpDir.substr(-1) !== '/')
            this.tmpDir += '/';
        this.app = express();
        this.environment = this.getEnvironment();
        this.domainName = this.environment.domain;
        this.protocol = this.environment.protocol || 'http';
        this.externalProtocol = this.environment.externalProtocol || 'https';
        this.dbconf = this.environment.db || { name: this.key };
        this.db = new db_1.LipthusDb(this.dbconf, this);
        this.dbs[this.db.name] = this.db;
        this.secret = 'lipthus ' + this.dbconf.name;
        this.config = new config_1.Config(this);
        this.connect();
    }
    getEnvironment() {
        if (process.env.LIPTHUS_ENV)
            return require(this.dir + '/environments/' + process.env.LIPTHUS_ENV).environment;
        if (fs_1.existsSync(this.srcDir + '/custom-conf.json')) {
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
            .on('ready', (db) => {
            db.addLipthusSchemas()
                .then(() => fs_1.existsSync(this.dir + '/schemas') && this.db.addSchemasDir(this.dir + '/schemas'))
                .then(() => this.init())
                .catch(this.emit.bind(this, 'error'));
        });
        this.db.connect();
    }
    // noinspection JSUnusedGlobalSymbols
    async addDb(name, schemasDir) {
        // old compat
        if (typeof name !== 'string')
            name = name.name;
        const db = new db_1.LipthusDb({ name: name }, this);
        db._conn = Object.assign(this.db._conn.useDb(name), {
            lipthusDb: db,
            site: this,
            app: this.app
        });
        this.dbs[name] = db;
        db.setFs();
        await db.addLipthusSchemas();
        if (schemasDir)
            await db.addSchemasDir(schemasDir);
        return db;
    }
    async init() {
        this.createApp();
        this.mailer = new mailer_1.Mailer(this.environment.mail, this);
        await this.config.load();
        const config = this.config;
        if (config.static_host)
            this.staticHost = this.externalProtocol + '://' + config.static_host;
        this.registerMethods = {
            site: config.site_credentials,
            google: config.googleApiKey && !!config.googleSecret,
            facebook: !!config.fb_app_id
        };
        await this.hooks('pre', 'checkVersion');
        await updater_1.checkVersions(this);
        await this.hooks('pre', 'setupApp');
        await this.setupApp();
        await this.hooks('post', 'setupApp');
        await ng2_1.default(this.app);
        await this.loadPlugins();
        await this.hooks('post', 'plugins');
        subscriber_1.Subscriber.init(this.app);
        debug(this.key + ' ready');
        await this.hooks('pre', 'finish');
        await this.finish();
        await this.hooks('post', 'finish');
        this.emit('ready');
    }
    get notifier() {
        if (!this._notifier)
            this._notifier = new notifier_1.Notifier(this);
        return this._notifier;
    }
    get authDb() {
        if (!this._authDb)
            this._authDb = this.environment.authDb ? this.dbs[this.environment.authDb] : this.db;
        return this._authDb;
    }
    get userCollection() {
        if (!this._userCol) {
            this.db.models.user = this.authDb.model('user');
            this._userCol = this.db.user;
        }
        return this._userCol;
    }
    hooks(hook, method) {
        const hooks = this._hooks;
        if (!hooks[hook])
            hooks[hook] = {};
        const fn = hooks[hook][method];
        if (!fn)
            return Promise.resolve();
        debug('site hook ' + hook + ' ' + method + ' ' + fn.name);
        return fn(this);
    }
    async loadPlugins() {
        const plugins = this.package.config.plugins;
        if (!plugins)
            return;
        for (const k of Object.keys(plugins)) {
            this.plugins[k] = await require(this.srcDir + '/node_modules/cmjs-' + k)(this.app);
            Object.defineProperty(this, k, { value: this.plugins[k] });
        }
    }
    toString() {
        return this.config && this.config.sitename || this.key;
    }
    async finish() {
        await routes_1.default(this.app);
        await this.routeNotFound();
        this.app.use(errorhandler_1.errorHandler);
        // para status 40x no disparamos error
        this.app.use(notfoundmin_1.default);
        if (!this.options.skipListening)
            await this.listen();
        else
            debug('Skip listening');
    }
    lessVars() {
        let ret;
        try {
            ret = require(this.srcDir + '/public/css/vars');
        }
        catch (e) {
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
    mainUrl(lang, omitePort) {
        let ret = this.externalProtocol + ':' + this.langUrl(lang);
        if (!omitePort && this.environment.port && !ret.match(/:/))
            ret += ':' + this.environment.port;
        return ret;
    }
    async sendMail(opt, throwError) {
        const email = await this.db.mailsent.create({ email: opt });
        await email.send();
        this.emit('mailsent', email);
        if (throwError && email.error)
            throw email.error;
        return email;
    }
    createApp() {
        const app = this.app;
        Object.defineProperty(this, 'app', { value: app });
        Object.defineProperty(app, 'site', { value: this });
        Object.defineProperty(app, 'db', { value: this.db });
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
        app.use((req, res, next) => {
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
                site: { value: this },
                db: { value: this.db }
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
                    subject: 'New error in ' + this.key,
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
        app.getModule = (name) => lipthus[name] || require('./' + name);
        // noinspection JSDeprecatedSymbols
        app.nodeModule = (name) => require(name);
        app.set('views', [this.srcDir + '/views', this.lipthusDir + '/views']);
        app.set('view engine', 'pug');
        // Para usar paths absolutos en pug extends
        app.locals.basedir = '/';
        app.use(logger_req_1.default);
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
        app.use(body_parser_1.urlencoded({
            limit: '1gb',
            extended: true
        }));
        app.use(express.json({ limit: '1gb' }));
        app.use(multipart_1.default);
        app.use(cookieParser());
        app.use(security_1.security.main);
    }
    async setupApp() {
        const app = this.app;
        Object.defineProperties(app, {
            db: { value: this.db },
            dbs: { value: this.dbs }
        });
        Object.each(require(this.lipthusDir + '/configs/defaults'), (k, v) => app.set(k, v));
        app.set('protocol', this.protocol);
        app.set('externalProtocol', this.externalProtocol);
        app.use(g_page_speed_1.GPageSpeedMiddleWare);
        app.use(require('./client')(app));
        app.locals.sitename = this.config.sitename;
        await multilang_1.MultilangModule(app);
        app.use(htmlpage_1.HtmlPageMiddleware);
        logger_1.LipthusLogger.init(app);
        if (this.config.sitemap && !this.environment.customSitemap)
            app.use((await Promise.resolve().then(() => require('./sitemap'))).default(this));
        if (this.config.fb_app_id)
            (await Promise.resolve().then(() => require('./facebook'))).default(app);
        if (this.config.sessionExpireDays) {
            app.use((await Promise.resolve().then(() => require('./session'))).default(this));
            app.use((await Promise.resolve().then(() => require('./auth'))).default(this));
        }
        app.use((req, res, next) => {
            res.timer.end('lipthus');
            res.timer.start('page');
            if (req.session) {
                req.session.last = {
                    host: req.hostname,
                    url: req.originalUrl
                };
            }
            else {
                req.session = {};
                req.getUser = () => Promise.resolve();
            }
            next();
        });
    }
    logo(width = 340, height = 48) {
        if (this.config.sitelogo)
            return this.config.sitelogo.info(width, height);
        return {
            uri: '/cms/img/logo.png',
            width: width,
            height: height
        };
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
            req.logger.logNotFound().then();
            res.htmlPage.triggerNotFound(res.statusCode, min);
        });
    }
    listen() {
        return listen_1.default(this.app)
            .then((r) => {
            this.emit('listen', r);
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
exports.Site = Site;
