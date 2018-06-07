const api = require('google-translate');

export class GoogleTranslator {

	public apiKey: string;
	public gt: GoogleApi;

	constructor(apiKey: string) {
		this.apiKey = apiKey;
		this.gt = api(apiKey);
	}

	availableLangs(cb: any) {
		this.gt.getSupportedLanguages((err: Error, result: any) => {
			if (err)
				return cb(err);

			const ret: Array<string> = [];

			result.forEach((o: any) => ret.push(o.language));

			return cb(null, ret);
		});
	}

	translate(src: Array<string>, from: string, to: string, cb: any) {
		this.gt.translate(src, from, to, (err, r) => {
			if (err)
				return cb(typeof err === 'string' ? new Error(err) : err);

			if (!r)
				return cb(new Error('Empty translate'));

			if (!Array.isArray(r))
				r = [r];

			const ret: Array<string> = [];

			// remove u200B ZERO WIDTH SPACE
			r.forEach(t => ret.push(t.translatedText ? t.translatedText.replace(/\u200B/g, '') : ''));

			return cb(null, ret);
		});
	}

	/**
	 *
	 * @param {string} target Lang code
	 * @param {Array} codes Usado para compatibilidad con azure
	 * @param {function} cb
	 * @returns {undefined}
	 */
	langNames(target: string, codes: Array<string>, cb: any) {
		this.gt.getSupportedLanguages(target, (err, result) => {
			if (err)
				return cb(err);

			const ret: any = {};

			result.data.languages.forEach((o: any) => ret[o.language] = o.name);

			if (target === 'ur' && !ret.ur)
				ret.ur = 'اردو';

			return cb(undefined, ret);
		});
	}
}

interface GoogleApi {
	translate(strings: Array<string>, sourceLang: string, targetLang: string, done: (err: Error | string, result: Array<any>) => any): any;
	getSupportedLanguages(target: string | any, done?: (err: Error | string, result: any) => any): any;
	detectLanguage:  any;
}
