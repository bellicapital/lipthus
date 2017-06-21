"use strict";

const fs = require('fs');
const crypto = require('crypto');
const uglify = require('uglify-es');
const path = require('path');

class JsManager {
	constructor(req, res) {
		this.dir = req.site.dir + '/public/js/';
		this.cmsDir = req.cmsDir + '/public/js/';
		this.jQueryVersion = req.app.get('jquery_version');
		this.jQueryUiVersion = req.app.get('jquery_ui_version');
		this.jQueryMobileVersion = req.app.get('jquery_mobile_version');
		this.staticHost = res.locals.staticHost;
		this.scripts = {};
		this.vars = {js: [], _lang: {}};
		this.lang = req.ml ? req.ml.lang : 'es';
		this.headInline = '';
		this.deferredInline = '';
		this.mobileAjaxEnabled = false;
		this.deviceType = req.device.type;

		Object.defineProperties(this, {
			cache: {value: req.db.cache},
			req: {value: req}
		});
	}

	add(src, opt) {
		if (Array.isArray(src)) {
			return src.forEach(s => {
				this.add(s, opt);
			});
		}
		
		if (path.extname(src) !== '.js' && /^\w/.test(src) && !/^http/.test(src)) {
			const srcE = src + '.js';
			const dSrcE = this.deviceType + '/' + srcE;

			if (exists(this.dir + dSrcE) || exists(this.cmsDir + dSrcE))
				src = dSrcE;
			else if (exists(this.dir + srcE) || exists(this.cmsDir + srcE))
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

	addVars(vars) {
		Object.keys(vars).forEach(k => this.vars[k] = vars[k]);
	}

	addLangVars(vars) {
		Object.keys(vars).forEach(k => this.vars._lang[k] = vars[k]);
	}

	addBower(key, file) {
		const dir = this.req.site.dir + '/bower_components/';

		this.scripts[key + '/' + file] = new JsFile({
			path: dir + key + '/dist/' + file,
			src: '/bower/' + key + '/' + file,
			priority: 25
		});
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

			const ret = {
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

			//sort by priority
			scriptsArray.sort((a, b) => {
				return b.priority - a.priority;
			});

			for (let s of scriptsArray) {
				let src = s.src;

				if (/^\w/.test(src) && !/^http/.test(src) && !/^\/\//.test(src)) {
					if (exists(this.dir + src)) {
						s.path = this.dir + src;
						src = '/s/js/' + src;
					} else {
						s.path = this.cmsDir + src;
						src = '/cms/js/' + src;
					}

					s.src = src;
				}

				if (!s.path) {
					const r = /^\/cms\/js(\/.+)/.exec(src);

					if (r)
						s.path = this.cmsDir + r[1];
					else if (/^\/s\/js\/.+/.test(src))
						s.path = dir + '/public' + src;
				}

				let _min = false;

				if (s.path && exists(s.path)) {
					s.mtime = fs.statSync(s.path).mtime.getTime() / 1000;

					if (s.minify) {
						toMinify[s.deferred ? (s.forceHtml ? 'body' : 'loader') : 'head'][src] = s;

						_min = true;
					}
				}

				_min || scripts.push(s);
			}

			for (let s of scripts) {
				const obj = {src: s.src};

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

			//Minify & combine
			let count = 0;

			Object.each(toMinify, (t, s) => {
				this.minify(s, t, (err, r) => {
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

	getMinified(script) {
		const cache = this.cache;
		const hash = crypto.createHash('sha1').update(script.path + script.mtime + script.priority).digest('hex').toString() + '.js';

		return cache.findOne({name: hash})
			.then(cached => {
				if (cached)
					return cached;

				const ugliResult = uglify.minify(fs.readFileSync(script.path, {encoding: 'utf8'}));

				if(ugliResult.error)
					throw ugliResult.error;

				return cache.create({
					name: hash,
					contentType: 'application/javascript',
					mtime: new Date(script.mtime * 1000),
					tag: "minify-js",
					source: script.path,
					MongoBinData: new Buffer(ugliResult.code)
				});
			});
	}

	minify(scripts, target, cb) {
		const ret = [];
		const sources = Object.keys(scripts);

		if(!sources.length)
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
					.cacth(err => {
						if (++count === length)
							cb(err, ret);
					});
			}
		});

		const getCachedSrc = cached => this.staticHost + '/c/' + cached._id + '.' + target + '_' + cached.created.getTime().toString().substr(7, 3) + '.min.js';
		const keys = Object.keys(toCombine);

		if (keys.length) {
			const hash = combinedHash.digest('hex').toString() + '.js';

			cache.findOne({name: hash})
				.then(cached => {
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
							.then(cached => {
								s.strmin = '/*' + path.basename(src) + '*/\n' + cached.MongoBinData.toString('utf-8') + '\n\n';

								++count;

								if(++count2 === keys.length) {
									let min = '';

									Object.each(toCombine, (src, s) => min += s.strmin);

									cache
										.create({
											name: hash,
											contentType: 'application/javascript',
											mtime: new Date(),
											created: new Date(),
											tag: "minify-combined-js",
											MongoBinData: new Buffer(min)
										})
										.then(cached => {
											ret.push({src: getCachedSrc(cached)});

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

class JsFile{
	constructor(p){
		this.minify = true;
		this.combine = true;
		this.forceHtml = false;
		this.async = false;
		this.deferred = true;
		this.attributes = [];
		this.priority = 0;
		
		Object.keys(p).forEach(k => {
			this[k] = p[k];
		});
	}
}

module.exports = JsManager;


function exists(fn){
	try {
		fs.accessSync(fn);
		return true;
	} catch(ex) {
		return false;
	}
}