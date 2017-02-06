"use strict";


const $ = require('../../utils');
const fs = require('fs');
const path = require('path');
const extensions = ['less', 'css'];
const debug = require('debug')('site:head.css');

class CssManager {
	constructor(req, res) {
		this.publicDir = req.site.dir + '/public';
		this.dir = this.publicDir + '/css/';
		this.cmsDir = req.site.cmsDir + '/public/css/';
		this.jQueryUiVersion = req.app.get('jquery_ui_version');
		this.jQueryMobile = false;
		this.jQueryMobileVersion = req.app.get('jquery_mobile_version');
		this.scripts = {};
		this.jQueryUiTheme = 'smoothness';
		this.staticHost = res.locals.staticHost;
		this.deviceType = req.device.type;
		this.routes = [
			{path: this.dir + this.deviceType, url: '/d/' + this.deviceType + '/', isDevice: true},
			{path: this.dir, url: '/d/g/'},
			{path: this.cmsDir + this.deviceType, url: '/d/' + this.deviceType + '/', isDevice: true, isCMS: true},
			{path: this.cmsDir, url: '/g/g/', isCMS: true}
		];
		Object.defineProperties(this, {
			cache: {value: req.db.cache},
			cacheless: {value: req.db.cacheless},
			req: {value: req}
		});
	}

	init() {
		if (this.inited) return this;

		this.inited = true;

		if (this.jQueryUi)
			this.add(this.jQueryuiSrc(), {priority: 40});

		if (this.jQueryMobile)
			this.addjQueryMobile();
	}

	add(src, opt) {
		if (typeof opt === 'number')
			opt = {priority: opt};
		else if (!opt)
			opt = {};
		else
			opt = Object.extend({}, opt);

		if (/^(http|\/)/.test(src) && !opt.path) {
			opt.url = src;
		} else if (/^\w/.test(src)) {
			const p = this.absolutePath(src);

			if (!p)
				return this;

			opt.path = p.path;
			opt.url = p.url;
			opt.device = p.isDevice && this.deviceType;
			opt.isCMS = !!p.isCMS;
			opt.basename = src;
			opt.ext = p.ext;

			const stat = fs.statSync(p.path);
			opt.mtime = Math.floor(stat.mtime.getTime() / 1000);

			src = p.path;
		}

		this.scripts[src] = new CssFile(opt);

		return this;
	}

	addBower(key, file) {
		const dir = this.req.site.dir + '/bower_components/';

		this.scripts[key + '/' + file] = new CssFile({
			path: dir + key + '/dist/' + file,
			url: '/bower/' + key + '/' + file,
			priority: 25
		});
	}

	final() {
		const ret = {
				head: [],
				inline: [],
				deferred: []
			},
			toCombine = {
				head: [],
				inline: [],
				deferred: []
			}
			, scripts = Object.values(this.scripts);

		//sort by priority
		scripts.sort((a, b) => b.priority - a.priority);

		scripts.forEach(script => {
			const target = script.inline ? 'inline' : (script.deferred ? 'deferred' : 'head');

			if (script.path && exists(script.path))
				return toCombine[target].push(script);

			const obj = {src: script.url};

			if (script.inline)
				obj.path = script.path;
			else if (script.mtime)
				obj.m = script.mtime;

			ret[target].push(obj);
		});

		return this.combine(toCombine.head)
			.then(r => r && ret.head.push(r))
			.then(() => this.combine(toCombine.deferred))
			.then(r => r && ret.deferred.push(r))
			.then(() => {
				let inline = '';

				ret.inline.forEach(il => {
					if (il.data)
						inline += il.data;
					else
						inline += fs.readFileSync(il.path);
				});

				ret.inline = inline;

				return ret;
			});
	}

	/**
	 * @param {string} [theme]
	 * @returns {string}
	 */
	jQueryuiSrc(theme) {
		theme = theme || this.jQueryUiTheme;

		//compat old ui versions
		if (theme === 'base')
			theme = 'smoothness';

		let file = theme + "/jquery-ui.min.css";

		if (!exists(this.publicDir + '/jquery-ui-custom/' + file)) {
			if (exists(this.publicDir + '/jquery-ui-custom/' + theme + "/jquery-ui.css"))
				file = "/s/jquery-ui-custom/" + theme + "/jquery-ui.css";
			else
				file = '//code.jquery.com/ui/' + this.jQueryUiVersion + '/themes/' + file;
		} else
			file = "/s/jquery-ui-custom/" + file;

		return file;
	}

	/**
	 * @param {string} [theme]
	 * @returns {string}
	 */
	addjQueryMobile(theme) {
		theme = theme || this.jQueryMobileTheme || 'default';

		if(theme === 'base')
			return this.add("//code.jquery.com/mobile/" + this.jQueryMobileVersion + '/jquery.mobile-' + this.jQueryMobileVersion + '.min.css', 34);

		this.add('jquery.mobile.structure-' + this.jQueryMobileVersion + '.min', 33);
		this.add('jquery.mobile.icons.min', 32);
		this.add(theme + '.mobile', 33);
	}

	combine(scripts) {
		if (!scripts.length)
			return Promise.resolve();

		let mtime = 0;
		const keys = [];
		const files = [];

		scripts.forEach(script => {
			keys.push(encodeURIComponent(script.baseKey()));

			files.push(script.path);

			if (mtime < script.mtime)
				mtime = script.mtime;
		});

		const basename = keys.join('+');

		return this.cacheless
			.getCachedFiles(files, basename)
			.then(r => ({
				src: this.staticHost + '/css/' + basename + '.' + Math.floor(mtime) + '.css',
				data: r.css
			}));
	}

	absolutePath(fn) {
		let ret = null;

		this.routes.some(route => {
			let ep = CssManager.extPath(route.path, fn);

			if (ep) {
				ret = ep;

				ret.isCMS = route.isCMS;
				ret.isDevice = !!route.isDevice;
				ret.url = '/css' + route.url + ep.basename + '.css';

				return true;
			}
		});

		return ret;
	}

	static extPath(dir, fn){
		const p = path.parse(fn);
		const fExt = p.ext.substr(1);
		let ret;

		if(fExt && extensions.indexOf(fExt) !== -1){
			ret = path.join(dir, fn);

			return exists(ret) && {path: ret, basename: p.name, fn: fn, ext: fExt};
		}

		extensions.some(function(ext){
			const fn2 = fn + '.' + ext;
			const tmp = path.join(dir, fn2);

			if(exists(tmp)){
				ret = {path: tmp, basename: fn, fn: fn2, ext: ext};

				return true;
			}
		});

		return ret;
	}
}


class CssFile {
	constructor(p) {
		this.inline = false;
		this.deferred = false;
		this.attributes = [];
		this.priority = 0;

		Object.keys(p).forEach(k => this[k] = p[k]);
	}

	baseKey() {
		return (this.isCMS ? 'g' : 'd')
			+ (this.device ? this.device.substr(0, 1) : 'g')
			+ '-' + this.basename;
	}
}


module.exports = CssManager;


function exists(fn){
	try {
		fs.accessSync(fn);
		return true;
	} catch(ex) {
		return false;
	}
}