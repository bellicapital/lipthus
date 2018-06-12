import {KeyString} from "../../interfaces/global.interface";

const MsTranslator = require('mstranslator');

export class AzureTranslator {

	public ms: MsTranslator;
	public globalError!: AzGlobalError;

	constructor(client_id: string, client_secret: string) {
		this.ms = new MsTranslator({
			client_id: client_id,
			client_secret: client_secret
		});
	}

	availableLangs(cb: any) {
		const ms = this.ms;

		ms.initialize_token(() => {
			ms.getLanguagesForTranslate(cb);
		});
	}

	translate(src: Array<string>, from: string, to: string, cb: any) {
		const params = {
			texts: src,
			from: from,
			to: to,
			ContentType: 'text/html'
		};
		const isHtml: Array<boolean> = [];

		if (!params.texts.length)
			return cb(new Error('Invalid translator params'));

		if (!params.texts.every(function (v, i) {
			if (!(v = v.trim())) return false;

			isHtml[i] = !!v.match(/<\w+>/);

			// caracteres que petan. si no es html, sustituimos retornos de carro por <br>
			v = v.replace(/[\n\r]/g, isHtml[i] ? '' : '<br>');

			return !!(params.texts[i] = v.replace(/"/g, '”'));
		}))
			return cb(new Error('Empty value to translate ' + src));

		// si hay algún problema global con la api, no seguimos
		if (this.globalError) {
			if (this.globalError.time > (Date.now() - 60000))
				return cb(this.globalError.err);
			else
				delete this.globalError;
		}

		try {
			this.ms.initialize_token((err1) => {
				if (err1)
					return cb(err1);

				this.ms.translateArray(params, (err: Error, r) => {
					if (!Array.isArray(r)) {
						if (!err)
							err = new Error(r);
					}

					if (err) {
						if (err.message.indexOf('zero balance'))
							this.globalError = {time: Date.now(), err: err};

						return cb(err);
					}

					const ret: Array<string> = [];

					(r as Array<any>) .forEach((v, i) => {
						v = v.TranslatedText.trim().replace(/« | »/g, '"');

						if (!isHtml[i])
							v = v.replace(/<br>/g, '\n');

						ret.push(v);
					});

					cb(null, ret);
				});
			});
		} catch (e) {
			cb(e);
		}
	}

	langNames(target: string, codes: Array<string>, cb: any) {
		this.ms.initialize_token( (err) => {
			if (err)
				return cb(err);

			this.ms.getLanguageNames({
				locale: target,
				languageCodes: codes
			}, (err2, r) => {
				if (err2)
					return cb(err2);

				const ret: KeyString = {};

				codes.forEach((code, idx) => ret[code] = r[idx]);

				cb(undefined, ret);
			});
		});
	}
}


interface MsTranslator {

	initialize_token(callback: (err: Error) => any, noRefresh?: boolean): any;
	getLanguagesForTranslate(callback: (err: Error) => any): any;
	translateArray(params: any, callback: (err: Error, r: string | Array<any>) => any): any;
	getLanguageNames(params: any, callback: (err: Error, r: Array<string>) => any): any;
}

interface AzGlobalError {
	time: number;
	err: Error;
}
