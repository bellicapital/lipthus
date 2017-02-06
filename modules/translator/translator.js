"use strict";

const langname = require('local-lang-names');

class Translator {
	constructor(site) {
		const config = site.config;

		this.service = config.translate_service;

		switch (this.service) {
			case 'azure':
				const AzureTranslator = require('./azureTranslator');

				this.client = new AzureTranslator(config.azure_client_id, config.azure_client_secret);

				break;
			case 'google':
				const GoogleTranslator = require('./googleTranslator');

				this.client = new GoogleTranslator(config.googleApiKey);

				break;
		}

		this._availableLangs;

		Object.defineProperties(this, {
			site: {value: site},
			tmp: {value: site.db.tmp},
			logger: {value: site.db.loggerTranslator},
			cache: {value: site.db.translatorCache}
		});

		Object.defineProperty(site, 'translator', {value: this});
	}

	availableLangs() {
		if (this._availableLangs)
			return Promise.resolve(this._availableLangs);

		if (!this.client)
			return Promise.reject(new Error('No client available'));

		return this.tmpNames()
			.then(availableLangs => {
				if (availableLangs)
					return this._availableLangs = availableLangs;

				return new Promise((ok, ko) => {
					this.client.availableLangs((err, availableLangs) => {
						if (err)
							return ko(err);

						this._availableLangs = {};

						console.info('Updating available language names');

						availableLangs.forEach(code => {
							if (!(this._availableLangs[code] = langname(code))) {
								switch (code) {
									case 'iw':
										this._availableLangs.he = langname('he');
										break;
									case 'jw':
										this._availableLangs.jw = 'Javanese';
										break;
									case 'ceb':
										this._availableLangs.ceb = 'Sinugboanon';//???
										break;
									case 'hmn':
										this._availableLangs.hmn = 'Hmong';//????
										break;
									default:
										console.warn('Langcode "' + code + '" name not found');
								}
							}
						});

						this.tmp.set(this.service + 'AvailableLangs', this._availableLangs);

						ok(this._availableLangs);
					});
				});
			});
	}

	translate(src, from, to, cb, srclog) {
		if (from === to)
			return cb(new Error('Translate from ' + from + ' to ' + to + '? ;-)'));

		const isString = typeof src === 'string';
		const src2 = isString ? [src] : src;
		const toTranslateIdx = [];
		const toTranslate = [];
		const ret = [];

		this.cache.get(src2, from, to, (err, cached) => {
			if (err)
				return cb(err);

			cached.forEach((c, idx) => {
				if (!c) {
					toTranslateIdx.push(idx);
					toTranslate.push(src2[idx]);
				} else
					ret[idx] = c;
			});

			if (!toTranslate.length)
				return cb(null, isString && ret ? ret[0] : ret);

			this.logger.log(toTranslate, to, this.service, null, srclog, (err, log) => {
				if (err)
					return cb(err);

				this.client.translate(toTranslate, from, to, (err, result) => {
					log.setDone(!err);

					if (result) {
						result.forEach((r, idx) => {
							if (r)
								this.cache.set(src2[toTranslateIdx[idx]], from, to, r);

							ret[toTranslateIdx[idx]] = r;
						});
					}

					cb(err, isString && ret ? ret[0] : ret);
				});
			});
		});
	}

	/**
	 * Obtiene una copia temporal de los nombres locales de los idiomas disponibles
	 */
	tmpNames() {
		return this.tmp.get(this.service + 'AvailableLangs')
			.then(tmp => {
				const ret = tmp && tmp.get('value');

				//si hace más de tres meses de la ultima consulta, lo eliminamos
				if (tmp && tmp.modified && tmp.modified.getTime() < Date.now() - 3600000 * 24 * 7 * 30 * 3) {
					//expired
					tmp.remove();
				}

				return ret;
			});
	}

	langNames(lang, cb) {
		this._langNames(lang, function (err, names) {
			if (!err && names)
				return cb(err, names);

			err.message = 'Can\'t get service lang names. Using defaults. Service Error (' + this.service + '): ' + err.message;
			cb(err, require('./langNames'));
		});
	}

	_langNames(lang, cb) {
		const key = this.service + 'AvailableLangs_' + lang;

		this.tmp.get(key, (err, tmp) => {
			if (tmp) {
				//si hace menos de seis meses de la ultima consulta, continuamos
				if (!tmp.modified || tmp.modified.getTime() > Date.now() - 3600000 * 24 * 7 * 30 * 6) {
					// not expired
					return cb(err, tmp.get('value'));
				}
			}

			this.availableLangs((err, langs) => {
				if (err)
					return cb(err);

				this.client.langNames(lang, Object.keys(langs), (err, names) => {
					if (err)
						return cb(err);

					this.tmp.set(key, names);

					cb(null, names);
				});
			});
		});
	}
}

module.exports = Translator;