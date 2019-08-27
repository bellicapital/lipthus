import {LipthusSchema, LipthusSchemaTypes} from "../lib";
import {Document, Model} from "mongoose";

const fs = require('mz/fs');
const debug = require('debug')('site:page');

export const name = 'user';

export function getSchema() {
	const s = new LipthusSchema({
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
		title: LipthusSchemaTypes.Multilang,
		pageTitle: LipthusSchemaTypes.Multilang,
		metaKeywords: LipthusSchemaTypes.Multilang,
		metaDescription: LipthusSchemaTypes.Multilang,
		menu: {type: Boolean, default: true},
		sitemap: {type: Boolean, default: false},
		theme: {type: String, default: "default"},
		robots: String,
		forceSSL: {type: Boolean, default: false},
		noCache: {type: Boolean, default: true},
		video: LipthusSchemaTypes.Fs,
		image: {type: LipthusSchemaTypes.BdfList, noWatermark: true},
		html: String
	}, {
		collection: 'pages',
		lastMod: true
	});

	s.methods = {
		display: function (req, res, next) {
			const route = req.site.dir + '/routes/' + (this.route || this.key);

			this.check(req)
				.then(() => res.htmlPage.init(this.toObject()))
				.then(() => {
					if (this.html)
						return this._display(res).catch(next);

					return fs.access(route + '.js', fs.constants.R_OK)
						.then(() => {
								const result = require(route).call(this, req, res, err => {
									debug('Page route callback is deprecated. Return Promise.');

									if (err && err instanceof Error)
										return next(err && (err as any).http_code === 404 ? null : err);

									this._display(res).catch(next);
								});

								if (result instanceof Promise)
									return result.then(this._display.bind(this, res), next);
							}
							// file does not exists -> display default
							, () => this._display(res));
				})
				.catch(next);
		},
		_display: function (res) {
			res.timer.end('page');

			return res.htmlPage.send();
		},
		check: function (req) {
			if (!req.ml.translateAvailable())
				return Promise.resolve();

			const keys = ['metaKeywords', 'pageTitle', 'title', 'metaDescription'];
			const promises = keys.map(k => this[k] && this[k].getLangOrTranslate(req.ml.lang));

			return Promise.all(promises);
		}
	};

	return s;
}

export interface LipthusPage extends Document {
	active: boolean;
	type: string;
	userLevel: number;
	contentType: string;
	expires: Date;
	url: string;
	debugImgRef: string;
	key: string;
	route: string;
	weight: number;
	title: any;
	pageTitle: any;
	metaKeywords: any;
	metaDescription: any;
	menu: boolean;
	sitemap: boolean;

	display: (req, res, next) => {};
}

export interface LipthusPageModel extends Model<LipthusPage> {

}
