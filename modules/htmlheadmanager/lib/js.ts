import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {LipthusRequest, LipthusResponse} from "../../../index";

// @types/uglify-es ???
const uglify = require("uglify-es");

export class JsManager {
	
	public dir: string;
	public lipthusDir: string;
	public jQuery = false;
	public jQueryMobile = false;
	public jQueryUi = false;
	public jQueryVersion: string;
	public jQueryUiVersion: string;
	public jQueryMobileVersion: string;
	public datepicker = false;
	public staticHost: string;
	public scripts: any = {};
	public vars = {js: <Array<any>>[], _lang: {}, mobileAjaxEnabled: false};
	public lang: string;
	public headInline = '';
	public mobileAjaxEnabled = false;
	public deferredInline = '';
	public deviceType: string;
	public cache: any;
	
	constructor(public req: LipthusRequest, res: LipthusResponse) {
		this.dir = req.site.dir + '/public/js/';
		this.lipthusDir = req.site.lipthusDir + '/public/js/';
		this.jQueryVersion = req.app.get('jquery_version');
		this.jQueryUiVersion = req.app.get('jquery_ui_version');
		this.jQueryMobileVersion = req.app.get('jquery_mobile_version');
		this.staticHost = res.locals.staticHost;
		this.scripts = {};
		this.lang = req.ml ? req.ml.lang : 'es';
		this.deviceType = req.device.type;
		this.cache = req.db.cache;
		Object.defineProperties(this, {
			req: {value: req}
		});
	}
	
	add(src: Array<string> | string, opt?: any): JsManager {
		if (Array.isArray(src)) {
			src.forEach(s => this.add(s, opt));
			
			return this;
		}
		
		if (path.extname(src) !== '.js' && /^\w/.test(src) && !/^http/.test(src)) {
			const srcE = src + '.js';
			const dSrcE = this.deviceType + '/' + srcE;
			
			if (exists(this.dir + dSrcE) || exists(this.lipthusDir + dSrcE))
				src = dSrcE;
			else if (exists(this.dir + srcE) || exists(this.lipthusDir + srcE))
				src = srcE;
		}
		
		if (opt === 'deferredInline')
			this.deferredInline += src;
		else if (opt === 'headInline')
			this.headInline += src;
		else {
			if (typeof opt === 'number')
				opt = {priority: opt};
			else if (!opt)
				opt = {};
			
			opt.src = src;
			
			this.scripts[src] = new JsFile(opt);
		}
		
		return this;
	}
	
	addVars(vars: any) {
		Object.keys(vars).forEach(k => this.vars[k] = vars[k]);
	}
	
	addLangVars(vars: any) {
		Object.keys(vars).forEach(k => this.vars._lang[k] = vars[k]);
	}
	
	final() {
		return new Promise((ok, ko) => {
			if (this.jQuery) {
				if (this.jQueryMobile) {
					this.add('//code.jquery.com/mobile/' + this.jQueryMobileVersion + '/jquery.mobile-' + this.jQueryMobileVersion + '.min.js', 40);
					
					this.vars.mobileAjaxEnabled = this.mobileAjaxEnabled;
					
					if (this.datepicker && !this.jQueryUi) {
						this.add('/cms/js/jquery/plugins/jquery.ui.datepicker.js', 12);
						this.add('/cms/js/jquery/plugins/jquery.mobile.datepicker.js', 10);
					}
				}
				
				if (this.datepicker)
					this.add('/cms/js/jquery/intl/jquery.ui.datepicker-' + this.lang + '.min.js', 11);
			}
			
			const ret: any = {
					head: [],
					body: [],
					headInline: this.headInline ? uglify.minify(this.headInline).code : '',
					bodyInline: this.deferredInline ? uglify.minify(this.deferredInline).code : ''
				},
				scripts = [],
				scriptsArray = Object.values(this.scripts),
				toMinify = {
					head: {},
					body: {},
					loader: {}
				};
			
			// sort by priority
			scriptsArray.sort((a, b) => {
				return b.priority - a.priority;
			});
			
			for (const s of scriptsArray) {
				let src = s.src;
				
				if (/^\w/.test(src) && !/^http/.test(src) && !/^\/\//.test(src)) {
					if (exists(this.dir + src)) {
						s.path = this.dir + src;
						src = '/s/js/' + src;
					} else {
						s.path = this.lipthusDir + src;
						src = '/cms/js/' + src;
					}
					
					s.src = src;
				}
				
				if (!s.path) {
					const r = /^\/cms\/js(\/.+)/.exec(src);
					
					if (r)
						s.path = this.lipthusDir + r[1];
					else if (/^\/s\/js\/.+/.test(src))
						s.path = this.dir + '/public' + src;
				}
				
				let _min = false;
				
				if (s.path && exists(s.path)) {
					s.mtime = fs.statSync(s.path).mtime.getTime() / 1000;
					
					if (s.minify) {
						toMinify[s.deferred ? (s.forceHtml ? 'body' : 'loader') : 'head'][src] = s;
						
						_min = true;
					}
				}
				
				if (!_min)
					scripts.push(s);
			}
			
			for (const s of scripts) {
				const obj: any = {src: s.src};
				
				if (s.mtime)
					obj.m = s.mtime;
				
				if (s.async)
					obj.async = s.async;
				
				if (s.forceHtml) {
					if (/^\/\w+/.test(s.src))
						obj.src = this.staticHost + s.src;
					
					ret[s.deferred ? 'body' : 'head'].push(obj);
				} else
					this.vars.js.push(obj);
			}
			
			if (this.jQuery) {
				if (this.jQueryUi)
					this.vars.js.unshift({src: '//code.jquery.com/ui/' + this.jQueryUiVersion + '/jquery-ui.min.js'});
				
				this.vars.js.unshift({src: '//code.jquery.com/jquery-' + this.jQueryVersion + '.min.js'});
			}
			
			// Minify & combine
			let count = 0;
			
			Object.each(toMinify, (t, s) => {
				this.minify(s, t, (err: Error, r: Array<any>) => {
					if (err)
						return ko(err);
					
					if (t === 'loader')
						this.vars.js = this.vars.js.concat(r);
					else if (r)
						ret[t] = ret[t].concat(r);
					
					if (++count === 3) {
						ret.bodyInline += 'window.euca = ' + JSON.stringify(this.vars) + ';';
						ok(ret);
					}
				});
			});
		});
	}
	
	getMinified(script: any): Promise<any> {
		const hash = crypto.createHash('sha1').update(script.path + script.mtime + script.priority).digest('hex').toString() + '.js';
		
		return this.cache.findOne({name: hash})
			.then((cached: any) => {
				if (cached)
					return cached;
				
				const ugliResult = uglify.minify(fs.readFileSync(script.path, {encoding: 'utf8'}));
				
				if (ugliResult.error)
					throw ugliResult.error;
				
				return this.cache.create({
					name: hash,
					contentType: 'application/javascript',
					mtime: new Date(script.mtime * 1000),
					tag: "minify-js",
					source: script.path,
					MongoBinData: new Buffer(ugliResult.code)
				});
			});
	}
	
	minify(scripts: Array<any>, target: string, cb: any) {
		const ret: Array<any> = [];
		const sources = Object.keys(scripts);
		
		if (!sources.length)
			return cb(null, ret);
		
		const cache = this.cache;
		const combinedHash = crypto.createHash('sha1');
		const toCombine = {};
		const length = Object.keys(scripts).length;
		let count = 0;
		
		Object.each(scripts, (src, s) => {
			if (s.combine) {
				combinedHash.update(s.path + s.mtime + s.priority);
				toCombine[src] = s;
			} else {
				this.getMinified(s)
					.then(r => {
						ret.push({src: this.staticHost + '/c/' + r._id + '/' + (r.source.replace(/.*\//g, ''))});
						
						if (++count === length)
							cb(null, ret);
					})
					.catch((err: Error) => {
						if (++count === length)
							cb(err, ret);
					});
			}
		});
		
		const getCachedSrc = (cached: any) => this.staticHost + '/c/' + cached._id + '.' + target + '_'
			+ cached.created.getTime().toString().substr(7, 3) + '.min.js';
		const keys = Object.keys(toCombine);
		
		if (keys.length) {
			const hash = combinedHash.digest('hex').toString() + '.js';
			
			cache.findOne({name: hash})
				.then((cached: any) => {
					if (cached) {
						ret.push({src: getCachedSrc(cached)});
						
						count += keys.length;
						
						if (count === length)
							cb(null, ret);
						
						return;
					}
					
					let count2 = 0;
					
					Object.each(toCombine, (src, s) => {
						this.getMinified(s)
							.then(cached2 => {
								s.strmin = '/*' + path.basename(src) + '*/\n' + cached2.MongoBinData.toString('utf-8') + '\n\n';
								
								++count;
								
								if (++count2 === keys.length) {
									let min = '';
									
									Object.each(toCombine, (src2: string, s2: any) => min += s2.strmin);
									
									cache
										.create({
											name: hash,
											contentType: 'application/javascript',
											mtime: new Date(),
											created: new Date(),
											tag: "minify-combined-js",
											MongoBinData: new Buffer(min)
										})
										.then((cached3: any) => {
											ret.push({src: getCachedSrc(cached3)});
											
											if (count === length)
												cb(null, ret);
										})
										.catch(cb);
								}
							})
							.catch(cb);
					});
				})
				.catch(cb);
		} else
			cb();
	}
}

class JsFile {
	
	public minify = true;
	public combine = true;
	public forceHtml = false;
	public async = false;
	public deferred = true;
	public attributes = [];
	public priority = 0;
	
	constructor(p: any) {
		Object.keys(p).forEach(k => this[k] = p[k]);
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
