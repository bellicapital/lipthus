"use strict";

const HeadManager = require('./htmlheadmanager');
const pug = require('pug');
const fs = require('mz/fs');
const debug = require('debug')('site:htmlpage');
const jsLangKeys = [
	'_YES', '_NO', '_CREATE', '_EDIT', '_DELETE', '_DATE', '_TITLE', '_NAME', '_DESCRIPTION', '_PREFERENCES',
	'_BACK', '_FETCHING', '_SUBMIT', '_ACCEPT', '_CANCEL', '_TOP', '_NOITEMS', '_DONE',
	'_NONE', '_UPLOAD', '_UPLOAD_VIDEO', '_UPLOAD_IMAGE', '_ACTIVE', '_CREATED', '_MODIFIED', '_IMAGE', '_US_NICKNAME', '_US_PASSWORD', '_ADD_DESCRIPTION'
];

class HtmlPage{
	constructor(req, res) {
		Object.defineProperties(this, {
			req: {value: req},
			res: {value: res},
			jQueryUI: {
				get: () => this._jQueryUI,
				set: b => {
					this._jQueryUI = this.head.js.jQueryUi = !!b;
				}
			}
		});

		this.jQuery = true;
		this._jQueryUI = false;
		this.jQueryUIcss = false;
		this.jQueryMobile = false;
		this.logLinks = false;
		this.head = new HeadManager(req, res);
		this.view = null;
		this.noCache = true;
		this.locals = this.res.locals;
		this.locals.justContent = !!(req.xhr || req.get('HTTP_X_EUCA') === 'content');
		this.key = req.path === '/' ? '' : req.path.match(/[^/]+/)[0];
		this.deviceType = req.device.type;
		this.openGraph = {};

		this.error = null;
	}

	init(opt){
		if(typeof opt === 'string')
			opt = {view: opt};

		this.set(opt);

		if (this.inited)
			return Promise.resolve(this);

		this.inited = true;

		this.lang = this.req.ml.lang;

		return this.checkUserLevel()
			.then(() => {
				let config = this.req.site.config;

				if (this.jQuery) {
					this.head.js.jQuery = true;

					if (this._jQueryUI) {
						this.head.js.jQueryUi = true;

						if (this.jQueryUIcss) {
							this.head.css.jQueryUi = true;
							this.head.css.jQueryUiTheme = this.uitheme || 'smoothness';
						}
					}

					if (this.jQueryMobile)
						this.head.jQueryMobile(this.jQueryMobileTheme || config.mobile_theme);

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

	set(opt) {
		if (opt)
			Object.extend(this, opt);

		return this;
	}

	checkUserLevel(level) {
		if (typeof level !== 'number')
			level = this.userLevel;

		const ok = Promise.resolve(this);

		if (!level)
			return ok;

		return this.req.getUser()
			.then(user => {
				if (user) {
					//Si el nivel de usuario es suficiente -> ok
					if (user.level >= level)
						return this;

					//Tipo de usuario especial
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

//view
		if (!this.view && fs.existsSync(req.site.dir + '/views/' + this.key + '.pug'))
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
			namespace: req.site.conf.db,
			deflang: config.language,
			theme: this.themeSet,
			staticUrl: this.locals.staticHost,
			anonpost: config.com_anonpost ? 1 : 0,
			com_rule: config.com_rule,
			anonvote: config.anonvote,
			apikeys: {},//todo
			maxSize: 'todo',
			allow_register: config.allow_register,
			logLink: this.logLinks && config.log_links,//todo: only in production mode
			user: req.user && req.user.baseInfo && req.user.baseInfo(),
			deviceType: this.deviceType,
			gpsi: res.locals.gpsi || undefined
		});

		if (!req.ml)
			return Promise.resolve(this);

		this.locals.LOCALE = req.ml.getLocale();

		this.addJSVars({
			locale: this.locals.LOCALE,
			_LANGCODE: this.lang, //@deprecated
			lang: this.lang,
			langs: req.ml.langs,
			translate: req.ml.translateAvailable()
		});

		return req.ml.load('ecms-user')
			.then(this.getPageTitle.bind(this))
			.then(this.setMetaKeywords.bind(this))
			.then(this.setMetaDescription.bind(this))
			.then(() => {
				Object.extend(this.locals, {
					LC: this.req.ml.all,
					lang: this.lang,
					langs: this.req.ml.langs
				});

				// old compatibility
				this.locals.title = this.locals.pageTitle;
			})
			.then(() => {
				const vars = {};

				jsLangKeys.forEach(v => vars[v] = req.ml.all[v]);

				this.head.addJSLang(vars);

				//page
				if (fs.existsSync(req.site.dir + '/public/js/' + this.deviceType + '/' + this.key + '.js'))
					this.head.addJS(this.deviceType + '/' + this.key + '.js', {priority: 10});
				else if (fs.existsSync(req.site.dir + '/public/js/' + this.key + '.js'))
					this.head.addJS(this.key + '.js', {priority: 10});

				this.key && this.head.addCSS(this.key, {priority: 10});

				if (this.userNav)
					this.addUserNav(true);

				//csrf
				if (req.csrfToken)
					this.head.addMeta('csrf', req.csrfToken());
			})
			.then(() => {
				//load layout module
				if (this.layout && fs.existsSync(req.site.dir + '/modules/' + this.layout + '.js'))
					return require(req.site.dir + '/modules/' + this.layout).call(this, req, res);
			})
			.then(() => {
				//layout
				// css
				this.head.addCSS(this.layout, {priority: 20});

				if (this.layout && fs.existsSync(req.site.dir + '/public/js/' + this.deviceType + '/' + this.layout + '.js'))
					this.addJS(this.deviceType + '/' + this.layout + '.js', {priority: 20});
				else if (this.layout && fs.existsSync(req.site.dir + '/public/js/' + this.layout + '.js'))
					this.addJS(this.layout + '.js', {priority: 20});

				if (req.app.get('env') === 'development') {
					this.addJS('debug.js');
					this.addCSS('debug');
				}

				this.setOpenGraph();

				return this;
			});
	}

	send(view, locals) {
		if (this.sent)
			return Promise.reject(new Error('HtmlPage already sent'));

		if(this.noCache)
			this.setNoCache();

		this.sent = true;

		if (typeof view === 'object')
			this.set(view);
		else if(view)
			this.view = view;

		return this.checkUserLevel()
			.then(this.init.bind(this))
			.then(this.load.bind(this))
			.then(() => {
				locals = Object.extend({
					page: this.key,
					metas: this.head.metas,
					hreflangs: this.head.hreflangs,
					user: this.req.user
				}, locals);

				Object.extend(this.locals, locals);

				this.addOpenGraphMetas();

				if (this.sitelogo)
					this.locals.logo = this.req.site.logo();

				if (!this.locals.justContent)
					return this.finalCSS()
						.then(this.finalJS.bind(this));
			})
			.then(this.render.bind(this));
	}

	finalCSS(){
		return this.head.css.final()
			.then(css => {
				this.locals.cssHead = css.head;
				this.locals.cssInline = css.inline;

				this.head.addJSVars({css: css.deferred});
			});
	}

	finalJS(){
		return this.head.js.final()
			.then(js => this.locals.js = js);
	}

	triggerNotFound(st, min) {
		st = st || 404;

		const sts = [404, 410];

		this.res.status(st);

		if (min && sts.indexOf(st) !== -1)
			return this.res.headersSent || this.res.render(this.req.cmsDir + '/views/status/' + st);

		const req = this.req;

		this.view = req.site.dir + '/views/' + this.deviceType + '/notfound';

		if (!fs.existsSync(this.view + '.pug'))
			this.view = req.site.dir + '/views/notfound';

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

	render() {
		const res = this.res;

		if(this.html) {
			let html = this.html;

			if(!html.match(/^\s*</))
				html = pug.compile(html, {filename: this.req.app.get('views')[0] + '/' + this.key})(Object.extend(res.locals, this.req.app.locals));

			return res.send(html)
		}

		const vPath = this.viewPath();

		res.timer.start('render');

		if (!vPath)
			return Promise.reject(new Error('no view'));

		try {
			res.render(vPath, (err, html) => {

				res.emit('render', err, html);

				if (err)
					res.req.next(err);
				else if (!res.headersSent)
					res.send(html);
			});
		} catch (e) {
			return Promise.reject(e);
		}
	}

	jQueryPlugin(name, opt) {
		this.head.jQueryPlugin(name, opt);

		return this;
	}

	getPageTitle() {
		if(this.locals.pageTitle)
			return this.locals.pageTitle;

		this.locals.pageTitle = (this.pageTitle && this.pageTitle[this.lang] || this.pageTitle) || (this.title && this.title[this.lang]) || this.title;

		if (!this.locals.pageTitle && this.locals.item && this.locals.item.getSocialTitle)
			this.locals.pageTitle = this.locals.item.getSocialTitle(this.lang);

		if (this.locals.pageTitle) {
			if(typeof this.locals.pageTitle === 'string')
				return this.locals.pageTitle;

			if(this.locals.pageTitle.getLangOrTranslate)
				return this.locals.pageTitle.getLangOrTranslate(this.lang)
					.then(r => this.locals.pageTitle = r);

			return this.locals.pageTitle;
		}

		return this.getSlogan()
			.then(slogan => this.locals.pageTitle = this.req.site.config.sitename + (slogan ? ' - ' + slogan : ''));
	}

	setMetaKeywords(){
		if(!this.metaKeywords || !this.metaKeywords.toString()) {
			this.metaKeywords = this.req.site.config.meta_keywords;

			if (!this.metaKeywords)
				return;
		}

		if(this.metaKeywords.getLangOrTranslate)
			return this.metaKeywords.getLangOrTranslate(this.lang)
				.then(r => {
					if(r){
						this.metaKeywords = r;
						this.head.addMetaName('keywords', this.metaKeywords);
					}
				});

		this.head.addMetaName('keywords', this.metaKeywords);
	}

	setMetaDescription(){
		const res = this.res;

		if (!this.metaDescription){
			if(res.locals.item)
				this.metaDescription = res.locals.item.getSocialDescription
					? res.locals.item.getSocialDescription(this.lang)
					: res.locals.item.description;

			else if(Object.keys(this.req.site.config.meta_description).length)
				this.metaDescription = this.req.site.config.meta_description;

			if (!this.metaDescription)
				return;
		}

		if(this.metaDescription.getLangOrTranslate)
			return this.metaDescription.getLangOrTranslate(this.lang)
				.then(r => {
					if(r){
						this.metaDescription = r;
						this.head.addMetaName('description', this.metaDescription);
					}
				});

		this.head.addMetaName('description', this.metaDescription);
	}

	getSlogan() {
		const config = this.req.site.config;

		let slogan = config.slogan;

		if (slogan[this.lang])
			return Promise.resolve(slogan[this.lang]);

		if(!slogan[config.language])
			return Promise.resolve('');

		return slogan.getLangOrTranslate(this.lang)
			.then(translated => {
				config.slogan[this.lang] = translated;

				debug('Slogan translated: %s -> %s', slogan[config.language], translated);

				return translated;
			});
	}

	setOpenGraph(){
		if(this.openGraphSet)
			return;

		this.openGraphSet = true;

		const req = this.req;
		const res = this.res;
		const og = this.openGraph;

		if(!og.site_name)
			og.site_name = req.site.config.sitename;

		if(!og.url)
			og.url = req.site.mainUrl(this.lang) + req.path;

		if(!og.app_id) {
			const fbid = req.site.config.fb_app_id;

			if(fbid)
				this.head.addMetaProperty('fb:app_id', fbid);
		}

		if(!og.title)
			og.title = this.locals.pageTitle;

		if(!og.description)
			og.description = this.metaDescription;

		if(!og.image && res.locals.item && res.locals.item.getSocialImage) {
			const img = res.locals.item.getSocialImage();

			if(img)
				og.image = req.site.mainUrl(this.lang) + img.uri;
		}

		if(!og.type)
			og.type = 'website';
		return this;
	}

	addOpenGraph(k, v, multiple){
		if(!multiple)
			this.openGraph[k] = v;
		else {
			if(!this.openGraph[k])
				this.openGraph[k] = [];

			this.openGraph[k].push(v);
		}

		return this;
	}

	addOpenGraphMetas(){
		Object.each(this.openGraph, (k, c) => {
			if(!c)
				return;

			if(typeof c === 'string')
				this.head.addMetaProperty('og:' + k, c);
			else if(Array.isArray(c))
				c.forEach(cc => {
					if(typeof cc === 'string')
						return this.head.addMetaProperty('og:' + k, cc);

					Object.each(cc, (j, v) => {
						this.head.addMetaProperty('og:' + k + ':' + j, v);
					});
				})
		});
	}

	viewPath() {
		if (!this.view)
			return;

		if (this.view[0] === '/')
			return this.view;

		const vDirs = this.req.app.get('views');
		const base = this.deviceType + '/' + this.view;

		let view = null;

		vDirs.some(dir => {
			if (fs.existsSync(dir + '/' + base + '.pug') || fs.existsSync(dir + '/' + base + '/index.pug')) {
				view = base;
				return true;
			}
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
	viewFullPath(view) {
		if (view)
			this.view = view;

		if (!this.view)
			return;

		if (this.view[0] === '/')
			return this.view;

		const vDirs = this.req.app.get('views');
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

	msg(msg) {
		this.view = this.req.site.dir + '/views/' + this.deviceType + '/message';

		if (!fs.existsSync(this.view + '.pug')) {
			this.view = this.req.site.dir + '/views/message';

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

	formScripts(level, multilang, cb) {
		this.head.formScripts(this.req, level, multilang, cb);

		return this;
	}

	addJS(src, opt) {
		this.head.addJS(src, opt);

		return this;
	}

	addCSS(src, opt) {
		this.head.addCSS(src, opt);

		return this;
	}

	addJSVars(vars) {
		this.head.addJSVars(vars);

		return this;
	}

	addJSLang(a) {
		this.head.addJSLang(a);

		return this;
	}

	//noinspection JSUnusedGlobalSymbols
	addMeta(meta) {
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

	setItem(item) {
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
	loadComments(item, cb) {
		if (typeof item === 'function') {
			cb = item;
			item = null;
		}

		this.formScripts(0);
		this.addLogin();
		this.addJS('comments.js');

		this.req.ml.load('ecms-comment', a => {
			const lang = {};
			lang['_CM_WRITE_HERE'] = a._CM_WRITE_HERE;

			this.head.addJSLang(lang);

			if (!item)
				return cb && cb();

			this.req.site.db.comment.find4show(item._id, function (err, comments) {
				if (err)
					return cb(err);

				this.res.locals.item.comments = comments;

				cb && cb(null, comments);
			});
		});
	}

	photoswipe(skin) {
		this.head.photoswipe(skin);
		return this;
	}

	setNoCache () {
		if (!this.res.headersSent)
			this.res.set({
				'Surrogate-Control': 'no-store',
				'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
				'Pragma': 'no-cache',
				'Expires': 'Tue, 27 Apr 1971 19:44:06 EST'
			});

		return this;
	}

	get mobileAjaxEnabled(){
		return this.head.js.mobileAjaxEnabled;
	}

	set mobileAjaxEnabled(v){
		this.head.js.mobileAjaxEnabled = v;
	}
}

HtmlPage.middleware = function(req, res, next){
	let ret;
	
	Object.defineProperty(res, 'htmlPage', {get: function(){
		if(!ret)
			ret = new HtmlPage(req, res, next);
		
		return ret;
	}});

	next();
};

module.exports = HtmlPage;