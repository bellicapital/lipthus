import * as fs from "fs";
import * as path from "path";
import {LipthusRequest, LipthusResponse} from "../../../index";

const extensions = ['less', 'css'];

export class CssManager {
	
	public publicDir: string;
	public dir: string;
	public lipthusDir: string;
	public jQueryUiVersion: string;
	public jQueryMobile = false;
	public jQueryUi = false;
	public jQueryMobileVersion: string;
	public jQueryMobileTheme?: string;
	public scripts: any = {};
	public jQueryUiTheme = 'smoothness';
	public staticHost: string;
	public deviceType: string;
	public routes: Array<CssRoute>;
	public inited = false;
	
	constructor(public req: LipthusRequest, res: LipthusResponse) {
		this.publicDir = req.site.dir + '/public';
		this.dir = this.publicDir + '/css/';
		this.lipthusDir = req.site.lipthusDir + '/public/css/';
		this.jQueryUiVersion = req.app.get('jquery_ui_version');
		this.jQueryMobileVersion = req.app.get('jquery_mobile_version');
		this.staticHost = res.locals.staticHost;
		this.deviceType = req.device.type;
		this.routes = [
			{path: this.dir + this.deviceType, url: '/d/' + this.deviceType + '/', isDevice: true},
			{path: this.dir, url: '/d/g/'},
			{path: this.lipthusDir + this.deviceType, url: '/d/' + this.deviceType + '/', isDevice: true, isCMS: true},
			{path: this.lipthusDir, url: '/g/g/', isCMS: true}
		];
	}
	
	init() {
		if (this.inited) return this;
		
		this.inited = true;
		
		if (this.jQueryUi)
			this.add(this.jQueryuiSrc(), {priority: 40});
		
		if (this.jQueryMobile)
			this.addjQueryMobile();
	}
	
	add(src: string, opt?: any) {
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
	
	final() {
		const ret: any = {
				head: [],
				inline: <Array<any>>[],
				deferred: []
			},
			toCombine: any = {
				head: [],
				inline: <Array<any>>[],
				deferred: []
			}
			, scripts = Object.values(this.scripts);
		
		// sort by priority
		scripts.sort((a, b) => b.priority - a.priority);
		
		scripts.forEach(script => {
			const target = script.inline ? 'inline' : (script.deferred ? 'deferred' : 'head');
			
			if (script.path && exists(script.path))
				return toCombine[target].push(script);
			
			const obj: any = {src: script.url};
			
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
				
				ret.inline.forEach((il: any) => {
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
	jQueryuiSrc(theme?: string) {
		theme = theme || this.jQueryUiTheme;
		
		// compat old ui versions
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
	addjQueryMobile(theme?: string) {
		theme = theme || this.jQueryMobileTheme || 'default';
		
		if (theme === 'base')
			return this.add("//code.jquery.com/mobile/" + this.jQueryMobileVersion + '/jquery.mobile-' + this.jQueryMobileVersion + '.min.css', 34);
		
		this.add('jquery.mobile.structure-' + this.jQueryMobileVersion + '.min', 33);
		this.add('jquery.mobile.icons.min', 32);
		this.add(theme + '.mobile', 33);
	}
	
	combine(scripts: Array<any>): Promise<any | undefined> {
		if (!scripts.length)
			return Promise.resolve();
		
		let mtime = 0;
		const keys: Array<string> = [];
		const files: Array<string> = [];
		
		scripts.forEach(script => {
			keys.push(encodeURIComponent(script.baseKey()));
			
			files.push(script.path);
			
			if (mtime < script.mtime)
				mtime = script.mtime;
		});
		
		const basename = keys.join('+');
		
		return this.req.db.cacheless
			.getCachedFiles(files, basename)
			.then((r: any) => ({
				src: this.staticHost + '/css/' + basename + '.' + Math.floor(mtime) + '.css',
				data: r.css
			}));
	}
	
	absolutePath(fn: string) {
		let ret: any = null;
		
		this.routes.some(route => {
			const ep: any = CssManager.extPath(route.path, fn);
			
			if (ep) {
				ret = ep;
				
				ret.isCMS = route.isCMS;
				ret.isDevice = route.isDevice;
				ret.url = '/css' + route.url + ep.basename + '.css';
				
				return true;
			} else
				return false;
		});
		
		return ret;
	}
	
	static extPath(dir: string, fn: string) {
		const p = path.parse(fn);
		const fExt = p.ext.substr(1);
		let ret;
		
		if (fExt && extensions.indexOf(fExt) !== -1) {
			ret = path.join(dir, fn);
			
			return exists(ret) && {path: ret, basename: p.name, fn: fn, ext: fExt};
		}
		
		extensions.some(ext => {
			const fn2 = fn + '.' + ext;
			const tmp = path.join(dir, fn2);
			
			if (exists(tmp)) {
				ret = {path: tmp, basename: fn, fn: fn2, ext: ext};
				
				return true;
			} else
				return false;
		});
		
		return ret;
	}
}


class CssFile {
	public inline = false;
	public deferred = false;
	public attributes = [];
	public priority = 0;
	public basename?: string;
	public device?: string;
	public isCMS?: boolean;
	
	constructor(p: any) {
		Object.keys(p).forEach(k => this[k] = p[k]);
	}
	
	baseKey() {
		return (this.isCMS ? 'g' : 'd')
			+ (this.device ? this.device.substr(0, 1) : 'g')
			+ '-' + this.basename;
	}
}


function exists(fn: string) {
	try {
		fs.accessSync(fn);
		return true;
	} catch (ex) {
		return false;
	}
}

export interface CssRoute {
	path: string;
	url: string;
	isDevice?: boolean;
	isCMS?: boolean;
}
