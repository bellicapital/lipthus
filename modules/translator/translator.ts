import {Site} from "../site";
import {AzureTranslator} from "./azureTranslator";
import {GoogleTranslator} from "./googleTranslator";
import {TmpModel} from "../../schemas/tmp";

const langname = require('local-lang-names');

export class Translator {

	public service: any;
	public client: AzureTranslator | GoogleTranslator | undefined;
	private tmp: TmpModel;
	private _availableLangs?: any;
	private cache: any;
	private logger: any;

	constructor(public site: Site) {
		const config = site.config;

		this.tmp = site.db.tmp;
		this.cache = site.db.translatorCache;
		this.logger = site.db.loggerTranslator;
		this.service = config.translate_service;

		switch (this.service) {
			case 'azure':

				this.client = new AzureTranslator(config.azure_client_id, config.azure_client_secret);

				break;
			case 'google':
				if (config.googleApiKey)
					this.client = new GoogleTranslator(config.googleApiKey);

				break;
		}

		site.translator = this;
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
					if (!this.client)
						return ko(new Error('No tranlator client'));

					this.client.availableLangs((err: Error, availableLangs2: Array<string>) => {
						if (err)
							return ko(err);

						this._availableLangs = {};

						console.log('Updating available language names');

						availableLangs2.forEach(code => {
							if (!(this._availableLangs[code] = langname(code))) {
								switch (code) {
									case 'iw':
										this._availableLangs.he = langname('he');
										break;
									case 'jw':
										this._availableLangs.jw = 'Javanese';
										break;
									case 'ceb':
										this._availableLangs.ceb = 'Sinugboanon'; // ???
										break;
									case 'hmn':
										this._availableLangs.hmn = 'Hmong'; // ????
										break;
									default:
										console.warn('Langcode "' + code + '" name not found');
								}
							}
						});

						this.tmp.set(this.service + 'AvailableLangs', this._availableLangs)
							.catch((errTmp: Error) => console.error(errTmp));

						ok(this._availableLangs);
					});
				});
			});
	}

	translate(src: string | Array<string>, from: string, to: string, cb: any, srclog: any) {
		if (from === to)
			return cb(new Error('Translate from ' + from + ' to ' + to + '? ;-)'));

		const src2: Array<string> = typeof src === 'string' ? [src] : src;
		const toTranslateIdx: Array<number> = [];
		const toTranslate: Array<string> = [];
		const ret: Array<string> = [];

		this.cache.get(src2, from, to, (err: Error, cached: any) => {
			if (err)
				return cb(err);

			cached.forEach((c: any, idx: number) => {
				if (!c) {
					toTranslateIdx.push(idx);
					toTranslate.push(src2[idx]);
				} else
					ret[idx] = c;
			});

			if (!toTranslate.length)
				return cb(null, typeof src === 'string' && ret ? ret[0] : ret);

			this.logger.log(toTranslate, to, this.service, null, srclog, (err2: Error, log: any) => {
				if (!this.client)
					err2 = new Error('Translator client not defined');

				if (err2)
					return cb(err2);

				this.client!.translate(toTranslate, from, to, (err3: Error, result: Array<string>) => {
					log.setDone(!err3);

					if (result) {
						result.forEach((r, idx) => {
							if (r)
								this.cache.set(src2[toTranslateIdx[idx]], from, to, r);

							ret[toTranslateIdx[idx]] = r;
						});
					}

					cb(err3, typeof src === 'string' && ret ? ret[0] : ret);
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

				// si hace más de tres meses de la ultima consulta, lo eliminamos
				if (tmp && tmp.modified && tmp.modified.getTime() < Date.now() - 3600000 * 24 * 7 * 30 * 3) {
					// expired
					tmp.remove();
				}

				return ret;
			});
	}

	langNames(lang: string, cb: any) {
		this._langNames(lang,  (err: Error, names: any) => {
			if (!err && names)
				return cb(err, names);

			err.message = 'Can\'t get service lang names. Using defaults. Service Error (' + this.service + '): ' + err.message;
			cb(err, require('./langNames'));
		});
	}

	_langNames(lang: string, cb: any) {
		const key = this.service + 'AvailableLangs_' + lang;

		this.tmp.get(key)
			.then(tmp => {
				if (tmp) {
					// si hace menos de seis meses de la ultima consulta, continuamos
					if (!tmp.modified || tmp.modified.getTime() > Date.now() - 3600000 * 24 * 7 * 30 * 6) {
						// not expired
						return cb(null, tmp.get('value'));
					}
				}

				return this.availableLangs()
					.then(langs => {
						this.client!.langNames(lang, Object.keys(langs), (err?: Error, names?: any) => {
							if (err)
								return cb(err);

							this.tmp.set(key, names)
								.then(() => cb(null, names));
						});
					});
			})
			.catch(cb);
	}
}
