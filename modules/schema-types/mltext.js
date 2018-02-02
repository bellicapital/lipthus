"use strict";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const SchemaType = mongoose.SchemaType;
const Types = mongoose.Types;
const debug = require('debug')('site:mltext');
const defaultLang = require('../multilang').Multilang.defaultLang;


class Multilang extends SchemaType {
	/**
	 * @param {String} key
	 * @param {Object} [options]
	 */
	constructor(key, options) {
		super(key, options, key ? 'Multilang' : 'MultilangArray');

		this.$conditionalHandlers = {
			'$lt': handleSingle
			, '$lte': handleSingle
			, '$gt': handleSingle
			, '$gte': handleSingle
			, '$ne': handleSingle
			, '$in': handleArray
			, '$nin': handleArray
			, '$mod': handleArray
			, '$all': handleArray
			, '$exists' : handleExists
		};
	}

	//noinspection JSMethodCanBeStatic
	checkRequired(val) {
		return null !== val;
	}

	//noinspection JSMethodCanBeStatic
	cast(val, scope, init) {
		if (null === val)
			return null;

		// si hay scope, tiene que ser un objeto porque pertenece a un ducumento
		// si no, puede ser un subdocumento y lo devolvemos tal cual
		if('object' !== typeof val)
			return scope ? null : val;

		if (!init || val instanceof MultilangText)
			return val;

		return new MultilangText(val, scope.collection, this.path, scope._id, scope.db.eucaDb.site);
	}

	/**
	 * Implement query casting, for mongoose 3.0
	 *
	 * @param {String} $conditional
	 * @param {*} [value]
	 */
	castForQuery($conditional, value) {
		if (2 === arguments.length) {
			const handler = this.$conditionalHandlers[$conditional];
			if (!handler) {
				throw new Error("Can't use " + $conditional + " with Multilang.");
			}
			return handler.call(this, value);
		} else {
			return this.cast($conditional);
		}
	}

	static get MultilangText(){
		return MultilangText;
	}
}

/*!
 * ignore
 */

const handleSingle = function(val){return this.cast(val);};
const handleExists = () => true;
const handleArray = function(val){return val.map(m => this.cast(m))};

class MultilangText {
	constructor(obj, collection, path, _id, site) {//t(7877, obj && obj.es)
		if(!site)
			console.trace('MultilangText no ha recibido el parámetro site');

		if(obj) {
			if (obj.undefined) {//tmp solution. No sé porqué, pero aparecen
				debug('lang code not valid: {undefined: ' + obj.undefined + '}');
				delete obj.undefined;
			}

			Object.extend(this, obj);
		}

		if(!this._id && _id)
			this._id = _id;

		site && Object.defineProperties(this, {
			site: {value: site},
			model: {get: () => site.db[collection.name]},
			collection: {value: collection},
			path: {get: () => path, set: v => path = v}
		});

		// if(path === 'options')
		// 	l(this.path)
	}

	getLang(lang, alt) {
		return this[lang] || (alt && this[alt]) || this[defaultLang] || '';
	}

	/**
	 *
	 * @param {string} lang
	 * @returns {Promise}
	 */
	getLangOrTranslate(lang){
		return new Promise((ok, ko) => {
			if(!lang)
				return ko(new Error('no lang provided'));

			if (this[lang]) {
				// jj - 24/11/16
				// solución temporal a un error pasado en las traducciones
				// eliminar en unos meses

				if(this[lang].constructor.name === 'Array' && this[lang][0].translatedText)
					this.updateLang(lang, this[lang][0].translatedText);

				// end tmp solution

				return ok(this[lang]);
			}

			const from = this.site.config.language;
			const src = this[from];

			if (!src)
				return ok();

			this.site.translate(src, from, lang, (err, data) => {
				ok(data || src);

				if (err)
					console.trace(err);

				if (!data)
					return;

				this.updateLang(lang, data);

			}, 'MultilangText.getLangOrTranslate: ' + this.collection.name + '.' + this.path);
		});
	}

	updateLang(lang, data){
		this[lang] = data;

		if(!this._id)
			console.error(new Error('MultilangText no updated. No _id provided. Data: ' + data));

		const update = {};

		update[this.path + '.' + lang] = data;

		this.collection.update({_id: this._id}, {$set: update})
			.then(r => {
				if(!r.result.nModified)
					console.error(new Error('MultilangText no updated. Id: ' + this._id + JSON.stringify(update)));
			})
			.catch(err => err && console.error(err));
	}

	toString() {
		return this[defaultLang] || '';
	}
}

/**
 * Expose
 */

Schema.Types.Multilang = Multilang;
Types.Multilang = Multilang;
module.exports.MultilangType = Multilang;
module.exports.MultilangText = MultilangText;
