"use strict";

const fs = require('mz/fs');
const debug = require('debug')('site:page');

module.exports = function page(Schema){
	const s = new Schema({
		active: {type: Boolean, default: true},
		type: String,
		userLevel: {type: Number, min: 0},
		contentType: {type: String, default: "text/html; charset=UTF-8"},
		expires: Date,
		url: {type: String, default: ''},
		debugImgRef: String,
		key: String,
		route: String,
		weight: {type: Number, min: 0, default: 0},
		title: Schema.Types.Multilang,
		pageTitle: Schema.Types.Multilang,
		metaKeywords: Schema.Types.Multilang,
		metaDescription: Schema.Types.Multilang,
		menu: {type: Boolean, default: true},
		sitemap: {type: Boolean, default: false},
		theme: {type: String, default: "default"},
		uitheme: String,
		robots: String,
		forceSSL: {type: Boolean, default: false},
		noCache: {type: Boolean, default: true},
		jQueryMobile: {type: Boolean, default: false},
		video: Schema.Types.Fs,
		image: {type: Schema.Types.BdfList, noWatermark: true},
		html: String
	}, {
		collection: 'pages',
		lastMod: true
	});
	/*
	s.options.toObject = {
		transform: function (doc, ret, options) {
			ret.css = doc.css;
		}
	};
	*/
	s.methods= {
		display: function(req, res, next){
			const route = req.site.dir + '/routes/' + (this.route || this.key);

			this.check(req)
				.then(() => res.htmlPage.init(this.toObject()))
				.then(p => {
					if (this.html)
						return this._display(res).catch(next);

					return fs.access(route + '.js', fs.constants.R_OK)
						.then(() => {
							const result = require(route).call(this, req, res, err => {
								debug('Page route callback is deprecated. Return Promise.');

								if (err && err instanceof Error)
									return next(err && err.http_code === 404 ? null : err);

								this._display(res);
							});

							if (result instanceof Promise)
								result.then(this._display.bind(this, res), next)
						}
						// file does not exists -> display default
						, () => this._display(res).catch(next))
				})
				.catch(next);
		},
		_display: function(res){
			res.timer.end('page');

			return res.htmlPage.send();
		},
		check: function(req){
			if(!req.ml.translateAvailable())
				return Promise.resolve();

			const keys = ['metaKeywords', 'pageTitle', 'title', 'metaDescription'];
			const promises = keys.map(k => this[k] && this[k].getLangOrTranslate(req.ml.lang));

			return Promise.all(promises);
		}
	};

	s.statics = {
		getAll: function(cb){
			this.find().sort({weight: 1}).exec(function(err, pages){
				if(err) return cb(err);

				const ret = {};

				pages.forEach(function(p){
					ret[p.key] = p.jsonInfo();
				});

				cb(err, ret);
			});
		}
	};

	return s;
};