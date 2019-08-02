import {LipthusRequest, LipthusResponse} from "../index";
import {NextFunction} from "express";
import {HeadManager} from "./htmlheadmanager";
import {KeyAny} from "../interfaces/global.interface";
import {MultilangText} from "./schema-types/mltext";
import * as pug from "pug";

const fs = require('mz/fs');
const debug = require('debug')('site:htmlpage');
const jsLangKeys = [
	'_YES', '_NO', '_CREATE', '_EDIT', '_DELETE', '_DATE', '_TITLE', '_NAME', '_DESCRIPTION', '_PREFERENCES',
	'_BACK', '_FETCHING', '_SUBMIT', '_ACCEPT', '_CANCEL', '_TOP', '_NOITEMS', '_DONE',
	'_NONE', '_UPLOAD', '_UPLOAD_VIDEO', '_UPLOAD_IMAGE', '_ACTIVE', '_CREATED', '_MODIFIED', '_IMAGE', '_US_NICKNAME', '_US_PASSWORD', '_ADD_DESCRIPTION'
];

export class HtmlPage {

	public jQuery = true;
	public logLinks = false;
	public head: HeadManager;
	public noCache = true;
	public locals: KeyAny;
	public key: string;
	public deviceType: string;
	public openGraph: any = {};
	public openGraphSet?: boolean;
	public error?: Error | any;
	public lang!: string;
	public userType?: string;
	public userLevel?: number;
	public formScriptsLevel?: number;
	public robots: any;
	public layout!: string;
	public view!: string;
	public pageTitle?: any;
	public sent = false;
	public sitelogo: any;
	public userNav?: boolean;
	public html?: string;
	public metaKeywords?: MultilangText;
	public metaDescription?: MultilangText | string;
	public title?: any;

	private initiated = false;
	private loaded = false;

	constructor(public req: LipthusRequest, public res: LipthusResponse) {
		this.jQuery = true;
		this.logLinks = false;
		this.head = new HeadManager(req, res);
		this.noCache = true;
		this.locals = this.res.locals;
		this.locals.justContent = (req.xhr || req.get('HTTP_X_EUCA') === 'content');
		this.key = req.path === '/' ? '' : req.path.match(/[^/]+/)![0];
		this.deviceType = req.device.type;
	}

	init(opt?: string | any): Promise<HtmlPage> {
		if (typeof opt === 'string')
			opt = {view: opt};

		this.set(opt);

		if (this.initiated)
			return Promise.resolve(this);

		this.initiated = true;

		this.lang = this.req.ml.lang;

		return this.checkUserLevel()
			.then(() => {
				const config = this.req.site.config;

				if (this.jQuery) {
					this.head.js.jQuery = true;
					this.head.css.init();

					this.addJS('loadCSS', {priority: 99, forceHtml: true});
					this.addJS('jsLoader', {priority: 98, forceHtml: true});
					this.addJS('euca.js', {priority: 40});

					if (this.formScriptsLevel !== undefined)
						this.formScripts(this.formScriptsLevel);
				}

				if (!this.robots)
					this.robots = config.metaRobots();

				return this;
			});
	}

	set(opt?: any) {
		if (opt)
			Object.assign(this, opt);

		return this;
	}

	checkUserLevel(level?: number) {
		if (typeof level !== 'number')
			level = this.userLevel;

		const ok = Promise.resolve(this);

		if (!level)
			return ok;

		return this.req.getUser()
			.then(user => {
				if (user) {
					// Si el nivel de usuario es suficiente -> ok
					if (user.level >= level!)
						return this;

					// Tipo de usuario especial
					if (user.level && this.userType && user.type === this.userType)
						return this;

					this.error = new Error('Not allowed');
					this.error.status = 403;
				} else {
					this.error = new Error('Forbidden');
					this.error.status = 401;
				}

				throw this.error;
			});
	}

	load() {
		if (this.loaded)
			return Promise.resolve(this);

		this.loaded = true;

		const req = this.req;
		const res = this.res;

		if (!this.layout)
			this.layout = req.site.config.theme_set || 'layout';

		if (this.layout === 'default')
			this.layout = 'layout';

		// view
		if (!this.view && fs.existsSync(req.site.srcDir + '/views/' + this.key + '.pug'))
			this.view = this.key;

		if (this.locals.justContent)
			return Promise.resolve(this);

		if (this.robots)
			this.head.addMetaName('robots', this.robots);

		const config = req.site.config;

		this.addJSVars({
			v: req.app.get('version'),
			path: req.headers.host,
			sitename: config.sitename,
			namespace: req.site.environment.db,
			deflang: config.language,
			staticUrl: this.locals.staticHost,
			anonpost: config.com_anonpost ? 1 : 0,
			com_rule: config.com_rule,
			anonvote: config.anonvote,
			apikeys: {}, // todo
			maxSize: 'todo',
			allow_register: config.allow_register,
			logLink: this.logLinks && config.log_links, // todo: only in production mode
			user: req.user && req.user.baseInfo && req.user.baseInfo(),
			deviceType: this.deviceType,
			gpsi: res.locals.gpsi || undefined
		});

		if (!req.ml)
			return Promise.resolve(this);

		this.locals.LOCALE = req.ml.getLocale();

		this.addJSVars({
			locale: this.locals.LOCALE,
			lang: this.lang,
			langs: req.ml.langs,
			translate: req.ml.translateAvailable()
		});

		return req.ml.load('ecms-user')
			.then(this.getPageTitle.bind(this))
			.then(this.setMetaKeywords.bind(this))
			.then(this.setMetaDescription.bind(this))
			.then(() => {
				Object.assign(this.locals, {
					LC: this.req.ml.all,
					lang: this.lang,
					langs: this.req.ml.langs
				});

				// old compatibility
				this.locals.title = this.locals.pageTitle;
			})
			.then(() => {
				const vars: any = {};

				jsLangKeys.forEach(v => vars[v] = req.ml.all[v]);

				this.head.addJSLang(vars);

				// page
				if (fs.existsSync(req.site.srcDir + '/public/js/' + this.deviceType + '/' + this.key + '.js'))
					this.head.addJS(this.deviceType + '/' + this.key + '.js', {priority: 10});
				else if (fs.existsSync(req.site.srcDir + '/public/js/' + this.key + '.js'))
					this.head.addJS(this.key + '.js', {priority: 10});

				if (this.key)
					this.head.addCSS(this.key, {priority: 10});

				if (this.userNav)
					this.addUserNav();

				// csrf
				if (req.csrfToken)
					this.head.addMetaName('csrf', req.csrfToken());
			})
			.then(() => {
				// load layout module
				try {
					return require(req.site.dir + '/modules/' + this.layout).call(this, req, res);
				} catch (e) {
				}
			})
			.then(() => {
				// layout
				// css
				this.head.addCSS(this.layout, {priority: 20});

				if (this.layout && fs.existsSync(req.site.srcDir + '/public/js/' + this.deviceType + '/' + this.layout + '.js'))
					this.addJS(this.deviceType + '/' + this.layout + '.js', {priority: 20});
				else if (this.layout && fs.existsSync(req.site.srcDir + '/public/js/' + this.layout + '.js'))
					this.addJS(this.layout + '.js', {priority: 20});

				if (req.app.get('env') === 'development') {
					this.addJS('debug.js');
					this.addCSS('debug');
				}

				this.setOpenGraph();

				return this;
			});
	}

	send(view?: string, locals: any = {}): Promise<any> {
		if (this.sent)
			return Promise.reject(new Error('HtmlPage already sent'));

		if (this.noCache)
			this.setNoCache();

		this.sent = true;

		if (typeof view === 'object')
			this.set(view);
		else if (view)
			this.view = view;

		return this.checkUserLevel()
			.then(this.init.bind(this))
			.then(this.load.bind(this))
			.then((): any => {
				locals = Object.assign({
					page: this.key,
					metas: this.head.metas,
					user: this.req.user
				}, locals);

				Object.assign(this.locals, locals);

				if (this.req.site.config.auto_hreflang && !this.locals.hreflangs)
					this.locals.hreflangs = this.head.hreflangs;

				if (!this.locals.canonical)
					this.locals.canonical = this.req.protocol + '://' + this.req.headers.host + this.req.path;

				this.head.addLink({rel: 'canonical', href: this.locals.canonical});

				this.addOpenGraphMetas();

				if (this.sitelogo)
					this.locals.logo = this.req.site.logo();

				if (!this.locals.justContent)
					return this.finalCSS()
						.then(this.finalJS.bind(this));
			})
			.then(this.render.bind(this));
	}

	finalCSS() {
		return this.head.css.final()
			.then(css => {
				this.locals.cssHead = css.head;
				this.locals.cssInline = css.inline;

				this.head.addJSVars({css: css.deferred});
			});
	}

	finalJS() {
		return this.head.js.final()
			.then(js => this.locals.js = js);
	}

	// noinspection JSUnusedGlobalSymbols
	triggerNotFound(st?: number, min?: boolean) {
		st = st || 404;

		const sts = [404, 410];

		this.res.status(st);

		if (min && sts.indexOf(st) !== -1)
			return this.res.headersSent || this.res.render(this.req.site.lipthusDir + '/views/status/' + st);

		const req = this.req;

		this.view = req.site.srcDir + '/views/' + this.deviceType + '/notfound';

		if (!fs.existsSync(this.view + '.pug'))
			this.view = req.site.srcDir + '/views/notfound';

		if (!fs.existsSync(this.view + '.pug'))
			this.view = 'status/404';

		this.head.addCSS('notfound');

		this.head.removeLink({rel: 'canonical', href: req.url});

		this.init()
			.then(() => this.load())
			.then(() => {
				delete this.robots;
				delete this.metaKeywords;
				delete this.metaDescription;

				if (fs.existsSync(req.site.dir + '/routes/notfound.js'))
					return require(req.site.dir + '/routes/notfound')(req, this.res);
			})
			.then(() => this.send())
			.catch(this.req.next);
	}

	render(): any {
		const res = this.res;

		if (this.html) {
			let html = this.html;

			if (!html.match(/^\s*</))
				html = pug.compile(html, {filename: this.req.app.get('views')[0] + '/' + this.key})(Object.assign(res.locals, this.req.app.locals));

			return res.send(html);
		}

		const vPath = this.viewPath();

		res.timer.start('render');

		if (!vPath)
			return Promise.reject(new Error('no view'));

		try {
			res.render(vPath, (err: Error, html: string) => {

				res.emit('render', err, html);

				if (err)
					this.req.next!(err);
				else if (!res.headersSent)
					res.send(html);
			});
		} catch (e) {
			return Promise.reject(e);
		}
	}

	getPageTitle() {
		if (this.locals.pageTitle)
			return this.locals.pageTitle;

		this.locals.pageTitle = (this.pageTitle && this.pageTitle[this.lang] || this.pageTitle) || (this.title && this.title[this.lang]) || this.title;

		if (!this.locals.pageTitle && this.locals.item && this.locals.item.getSocialTitle)
			this.locals.pageTitle = this.locals.item.getSocialTitle(this.lang);

		if (this.locals.pageTitle) {
			if (typeof this.locals.pageTitle === 'string')
				return this.locals.pageTitle;

			if (this.locals.pageTitle.getLangOrTranslate)
				return this.locals.pageTitle.getLangOrTranslate(this.lang)
					.then((r: string) => this.locals.pageTitle = r);

			return this.locals.pageTitle;
		}

		return this.getSlogan()
			.then(slogan => this.locals.pageTitle = this.req.site.config.sitename + (slogan ? ' - ' + slogan : ''));
	}

	setMetaKeywords() {
		if (!this.metaKeywords || !this.metaKeywords.toString()) {
			this.metaKeywords = this.req.site.config.meta_keywords;

			if (!this.metaKeywords)
				return;
		}

		if (this.metaKeywords.getLangOrTranslate)
			return this.metaKeywords.getLangOrTranslate(this.lang)
				.then((r: any) => {
					if (r) {
						this.metaKeywords = r;
						this.head.addMetaName('keywords', this.metaKeywords + '');
					}
				});

		this.head.addMetaName('keywords', this.metaKeywords + '');
	}

	setMetaDescription() {
		const res = this.res;

		if (!this.metaDescription) {
			if (res.locals.item)
				this.metaDescription = res.locals.item.getSocialDescription
					? res.locals.item.getSocialDescription(this.lang)
					: res.locals.item.description;

			else if (Object.keys(this.req.site.config.meta_description).length)
				this.metaDescription = this.req.site.config.meta_description;

			if (!this.metaDescription)
				return;
		}

		if (this.metaDescription instanceof MultilangText)
			return this.metaDescription.getLangOrTranslate(this.lang)
				.then(r => {
					if (r) {
						this.metaDescription = r;
						this.head.addMetaName('description', this.metaDescription + '');
					}
				});

		this.head.addMetaName('description', this.metaDescription + '');
	}

	getSlogan(): Promise<string> {
		const config: any = this.req.site.config;

		const slogan: any = config.slogan;

		if (slogan[this.lang])
			return Promise.resolve(slogan[this.lang]);

		if (!slogan[config.language])
			return Promise.resolve('');

		return slogan.getLangOrTranslate(this.lang)
			.then((translated: string) => {
				config.slogan[this.lang] = translated;

				debug('Slogan translated: %s -> %s', slogan[config.language], translated);

				return translated;
			});
	}

	setOpenGraph() {
		if (this.openGraphSet)
			return;

		this.openGraphSet = true;

		const req = this.req;
		const res = this.res;
		const og = this.openGraph;

		if (!og.site_name)
			og.site_name = req.site.config.sitename;

		if (!og.url)
			og.url = req.protocol + '://' + req.headers.host + req.path;

		if (!og.app_id) {
			const fbid = req.site.config.fb_app_id;

			if (fbid)
				this.head.addMetaProperty('fb:app_id', fbid);
		}

		if (!og.title)
			og.title = this.locals.pageTitle;

		if (!og.description)
			og.description = this.metaDescription;

		if (!og.image && res.locals.item && res.locals.item.getSocialImage) {
			const img = res.locals.item.getSocialImage();

			if (img)
				og.image = req.site.mainUrl(this.lang) + img.uri;
		}

		if (!og.type)
			og.type = 'website';
		return this;
	}

	addOpenGraph(k: string, v: string, multiple?: boolean) {
		if (!multiple)
			this.openGraph[k] = v;
		else {
			if (!this.openGraph[k])
				this.openGraph[k] = [];

			this.openGraph[k].push(v);
		}

		return this;
	}

	addOpenGraphMetas() {
		Object.each(this.openGraph, (k, c) => {
			if (!c)
				return;

			if (typeof c === 'string')
				this.head.addMetaProperty('og:' + k, c);
			else if (Array.isArray(c))
				c.forEach(cc => {
					if (typeof cc === 'string')
						return this.head.addMetaProperty('og:' + k, cc);

					Object.each(cc, (j, v) => this.head.addMetaProperty('og:' + k + ':' + j, v));
				});
		});
	}

	viewPath() {
		if (!this.view)
			return;

		if (this.view[0] === '/')
			return this.view;

		// noinspection JSMismatchedCollectionQueryUpdate
		const vDirs: Array<string> = this.req.app.get('views');
		const base = this.deviceType + '/' + this.view;

		let view = null;

		vDirs.some(dir => {
			if (fs.existsSync(dir + '/' + base + '.pug') || fs.existsSync(dir + '/' + base + '/index.pug')) {
				view = base;
				return true;
			}

			return false;
		});

		return view || this.view;
	}

	//noinspection JSUnusedGlobalSymbols
	/**
	 * Asigna el path completo de view si se encuentra
	 * Usado en cmjs-newsletter plugin
	 *
	 * @param {String} view
	 * @returns {*}
	 */
	viewFullPath(view: string) {
		if (view)
			this.view = view;

		if (!this.view)
			return;

		if (this.view[0] === '/')
			return this.view;

		const vDirs: Array<string> = this.req.app.get('views');
		const dirOpt = [
			this.deviceType + '/' + this.view + '.pug',
			this.deviceType + '/' + this.view + '/index.pug',
			this.view + '.pug',
			this.view + '/index.pug'
		];

		const r = vDirs.some(dir => {
			return dirOpt.some(opt => {
				view = dir + '/' + opt;

				return fs.existsSync(view);
			});
		});

		return r && (this.view = view);
	}

	msg(msg: string) {
		this.view = this.req.site.srcDir + '/views/' + this.deviceType + '/message';

		if (!fs.existsSync(this.view + '.pug')) {
			this.view = this.req.site.srcDir + '/views/message';

			if (!fs.existsSync(this.view + '.pug'))
				this.view = 'message';
		}

		this.res.locals.message = msg;

		if (!fs.existsSync(this.req.site.dir + '/routes/message.js'))
			return this.send();

		require(this.req.site.dir + '/routes/message').call(this, this.req, this.res, () => this.send());
	}

	//noinspection JSUnusedGlobalSymbols
	formScriptsMobile() {
		return this.head.formScriptsMobile()
			.then(() => this);
	}

	formScripts(level: number, multilang?: boolean) {
		this.head.formScripts(level, multilang);

		return this;
	}

	addJS(src: string, opt?: any) {
		this.head.addJS(src, opt);

		return this;
	}

	addCSS(src: string, opt?: any) {
		this.head.addCSS(src, opt);

		return this;
	}

	addJSVars(vars: KeyAny) {
		this.head.addJSVars(vars);

		return this;
	}

	// noinspection JSUnusedGlobalSymbols
	addJSLang(a: any) {
		this.head.addJSLang(a);

		return this;
	}

	//noinspection JSUnusedGlobalSymbols
	addMeta(meta: any) {
		this.head.addMeta(meta);

		return this;
	}

	addLogin() {
		this.addJS('login');
		// this.addJS("http://cdn.auth0.com/js/lock/10.9.1/lock.min.js");
	}

	addUserNav() {
		this.addJS('usernav');
		this.addLogin();
	}

	setItem(item: any) {
		/* next version
		// si es un Doc de mongoose, lo parseamos
		if(item instanceof 'model') {
			item = {
				id: item.id,
				title: item.title,
				dbname: item.db.name + '',
				schema: item.schema + '',
				comments: item.comments
			};
		}*/

		this.res.locals.item = item;

		return this.addJSVars({item: {id: item.id}});
	}

	//noinspection JSUnusedGlobalSymbols
	loadComments(item: any) {
		this.formScripts(0);
		this.addLogin();
		this.addJS('comments.js');

		return this.req.ml.load('ecms-comment')
			.then(a => {
				const lang: any = {};
				lang['_CM_WRITE_HERE'] = a._CM_WRITE_HERE;

				this.head.addJSLang(lang);

				if (!item)
					return;

				return this.req.site.db.comment.find4show(item._id)
					.then((comments: Array<any>) => {

						this.res.locals.item.comments = comments;

						return comments;
					});
			});
	}

	setNoCache() {
		if (!this.res.headersSent)
			this.res.set({
				'Surrogate-Control': 'no-store',
				'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
				'Pragma': 'no-cache',
				'Expires': 'Tue, 27 Apr 1971 19:44:06 EST'
			});

		return this;
	}

	get mobileAjaxEnabled() {
		return this.head.js.mobileAjaxEnabled;
	}

	set mobileAjaxEnabled(v) {
		this.head.js.mobileAjaxEnabled = v;
	}
}

export function HtmlPageMiddleware(req: LipthusRequest, res: LipthusResponse, next: NextFunction) {
	let ret: HtmlPage;

	Object.defineProperty(res, 'htmlPage', {
		get: function () {
			if (!ret)
				ret = new HtmlPage(req, res);

			return ret;
		}
	});

	next();
}
