"use strict";

/**
 * No funciona con textos grandes
 */



const api = require('googleapis').translate('v2');

class GoogleTranslator {
	constructor(apiKey) {
		this.apiKey = apiKey;
	}

	availableLangs(cb) {
		api.languages.list({auth: this.apiKey}, (err, result) => {
			if (err)
				return cb(err);

			const ret = [];

			result.data.languages.forEach(o => {
				ret.push(o.language);
			});

			return cb(null, ret);
		});
	}

	translate(src, from, to, cb) {
		//Máximo de 128 segmentos simultáneos. Optimizado a 64 para mejor gestión de errores
		if (Array.isArray(src) && src.length > 64) {
			let i;
			let j;
			const tmp = [];
			const srcs = src.slice(0);
			const chunk = 64;

			for (i = 0, j = srcs.length; i < j; i += chunk) {
				tmp.push(srcs.slice(i, i + chunk));
			}

			let ret = [];

			const trNext = idx => {
				this.translate(tmp[idx], from, to, (err, r) => {
					if (err || !r)
						return cb(err, ret);

					ret = ret.concat(r);

					if (tmp[++idx])
						trNext(idx);
					else
						cb(null, ret);
				});
			};

			return trNext(0);
		}

		api.translations.list({
			q: src,
			source: from,
			target: to,
			format: 'html',
			auth: this.apiKey
		}, (err, r) => {
			if (err)
				return cb(err);

			if (!r)
				return cb(new Error('Empty translate'));

			if (typeof r === 'string') {
				if (Array.isArray(src) && src.length > 1) {
					//traducimos uno por uno para detectar que cadena tiene el error

					const ret = [];

					const trNextOne = idx => {
						this.translate(src[idx], from, to, (err, r) => {
							if (err || !r)
								return cb(err, ret);

							ret.push(r[0]);

							if (src[++idx])
								trNextOne(idx);
							else
								cb(null, ret);
						});
					};

					return trNextOne(0);
				}

				return cb(new Error(r.indexOf('Bad Request') !== -1 ? 'Bad Request: ' + src : r));
			}

			if (!r || !r.data.translations)
				return cb();

			r.data.translations.forEach((t, i) => {
				r.data.translations[i] = t.translatedText;
			});

			return cb(null, r.data.translations);
		});
	}

	/**
	 *
	 * @param {string} target Lang code
	 * @param {array} codes Usado para compatibilidad con azure
	 * @param {function} cb
	 * @returns {undefined}
	 */
	langNames(target, codes, cb) {
		api.languages.list({auth: this.apiKey, target: target}, (err, result) => {
			if (err)
				return cb(err);

			const ret = {};

			result.data.languages.forEach(o => {
				ret[o.language] = o.name;
			});

			if (target === 'ur' && !ret.ur)
				ret.ur = 'اردو';

			return cb(null, ret);
		});
	}
}

module.exports = GoogleTranslator;