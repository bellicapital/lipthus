import {Schema, SchemaType, Types} from "mongoose";
import * as debug0 from "debug";
import {Site} from "../site";
import {LipthusDb} from "../db";

const debug = debug0('site:mltext');
const defaultLang = require('../multilang').Multilang.defaultLang;


export class Multilang extends SchemaType {
	/**
	 * @param {String} path
	 * @param {Object} [options]
	 */
	constructor(public path: string, public options: any) {
		super(path, options, path ? 'Multilang' : 'MultilangArray');
	}

	//noinspection JSMethodCanBeStatic
	get $conditionalHandlers() {
		return {
			'$lt': handleSingle
			, '$lte': handleSingle
			, '$gt': handleSingle
			, '$gte': handleSingle
			, '$ne': handleSingle
			, '$in': handleArray
			, '$nin': handleArray
			, '$mod': handleArray
			, '$all': handleArray
			, '$exists': handleExists
		};
	}

	//noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
	checkRequired(val: any) {
		return null !== val;
	}

	//noinspection JSMethodCanBeStatic
	cast(val: any, scope?: any, init?: any) {
		if (null === val)
			return null;

		// si hay scope, tiene que ser un objeto porque pertenece a un ducumento
		// si no, puede ser un subdocumento y lo devolvemos tal cual
		if ('object' !== typeof val)
			return scope ? null : val;

		if (!init || val instanceof MultilangText)
			return val;

		return new MultilangText(val, scope.collection, this.path, scope._id, scope.db.lipthusDb);
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Implement query casting, for mongoose 3.0
	 *
	 * @param {String} $conditional
	 * @param {*} [value]
	 */
	castForQuery($conditional: any, value: any) {
		if (2 === arguments.length) {
			const handler = (this.$conditionalHandlers as any)[$conditional];
			if (!handler) {
				throw new Error("Can't use " + $conditional + " with Multilang.");
			}
			return handler.call(this, value);
		} else {
			return this.cast($conditional);
		}
	}

	static get MultilangText() {
		return MultilangText;
	}
}

/*!
 * ignore
 */

const handleSingle = function (this: any, val: any) {
	return this.cast(val);
};
const handleExists = () => true;
const handleArray = function (this: any, val: Array<any>) {
	return val.map(m => this.cast(m));
};

export class MultilangText {

	public site: Site;

	constructor(public obj: any, public collection: any, public path: string, public _id: Types.ObjectId, db: LipthusDb) {
		this.site = db.site;

		if (obj) {
			if (obj.undefined) {	// tmp solution. jj - No sé porqué, pero aparecen
				debug('lang code not valid: {undefined: ' + obj.undefined + '}');
				delete obj.undefined;
			}
		}

		Object.defineProperties(this, {
			model: {get: () => db[collection.name]}
		});
	}

	toJSON() {
		return this.obj;
	}

	getLang(lang: string, alt?: string): string {
		return this.obj[lang] || (alt && this.obj[alt]) || this.obj[defaultLang] || '';
	}

	// setLang(lang: string, value: string) {
	// 	this.obj[lang] = value;
	// }

	/**
	 *
	 * @param {string} lang
	 * @returns {Promise}
	 */
	getLangOrTranslate(lang: string): Promise<string> {
		return new Promise((ok, ko) => {
			if (!lang)
				return ko(new Error('no lang provided'));

			if (this.obj[lang]) {
				// jj - 24/11/16
				// solución temporal a un error pasado en las traducciones
				// eliminar en unos meses

				if (this.obj[lang].constructor.name === 'Array' && this.obj[lang][0].translatedText)
					this.updateLang(lang, this.obj[lang][0].translatedText);

				// end tmp solution

				return ok(this.obj[lang]);
			}

			const from = this.site.config.language;
			const src = this.obj[from];

			if (!src || !this.site.translator)
				return ok();

			this.site.translate(src, from, lang, (err: Error | any, data: any) => {
				ok(data || src);

				if (err)
					console.error(err.error || (err.response && err.response.body) || err);

				if (!data)
					return;

				this.updateLang(lang, data);

			}, 'MultilangText.getLangOrTranslate: ' + this.collection.name + '.' + this.path);
		});
	}

	updateLang(lang: string, data: any) {
		this.obj[lang] = data;

		if (!this._id)
			console.error(new Error('MultilangText no updated. No _id provided. Data: ' + data));

		const update: { [s: string]: any } = {};

		update[this.path + '.' + lang] = data;

		this.collection.updateOne({_id: this._id}, {$set: update})
			.then((r: any) => {
				if (!r.result.nModified)
					console.error(new Error('MultilangText no updated. Id: ' + this._id + JSON.stringify(update)));
			})
			.catch((err: Error) => console.error(err));
	}

	toString() {
		return this.obj[defaultLang] || '';
	}
}

/**
 * Expose
 */
(Schema.Types as any).Multilang = Multilang;
(Types as any).Multilang = Multilang;

export {Multilang as MultilangType};
