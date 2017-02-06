"use strict";

const translator = require('mstranslator');

function AzureTranslator(client_id, client_secret){
	this.ms = new translator({
		client_id: client_id,
		client_secret: client_secret
	});
}

AzureTranslator.prototype.availableLangs = function(cb){
	const ms = this.ms;

	ms.initialize_token(function(err){
		ms.getLanguagesForTranslate(cb);
	});
};

AzureTranslator.prototype.translate = function(src, from, to, cb){
	const params = {
		texts: src,
		from: from,
		to: to,
		ContentType: 'text/html'
	};
	const isHtml = [];

	if(!params.texts.length)
		return cb(new Error('Invalid translator params'));

	if(!params.texts.every(function(v, i){
		if(!(v = v.trim())) return false;

		isHtml[i] = !!v.match(/<\w+>/);

		//caracteres que petan. si no es html, sustituimos retornos de carro por <br>
		v = v.replace(/[\n\r]/g, isHtml[i] ? '' : '<br>');

		return !!(params.texts[i] = v.replace(/"/g, '”'));
	}))
		return cb(new Error('Empty value to translate ' + src));

	//si hay algún problema global con la api, no seguimos
	if(this.globalError){
		if(this.globalError.time > (Date.now() - 60000))
			return cb(this.globalError.err);
		else
			delete this.globalError;
	}

	try {
		this.ms.initialize_token(err => {
			if(err)
				return cb(err);

			this.ms.translateArray(params, (err, r) => {
				if(!err && !Array.isArray(r))
					err = new Error(r);

				if(err){
					if(err.message.indexOf('zero balance'))
						this.globalError = {time: Date.now(), err: err};

					return cb(err);
				}

				const ret = [];

				r.forEach((v, i) => {
					v = v.TranslatedText.trim().replace(/« | »/g, '"');

					if(!isHtml[i])
						v = v.replace(/<br>/g, '\n');

					ret.push(v);
				});

				cb(null, ret);
			});
		});
	} catch(e){
		cb(e);
	}
};

AzureTranslator.prototype.langNames = function(target, codes, cb){
	const ms = this.ms;

	ms.initialize_token(function(err){
		ms.getLanguageNames({
			locale: target,
			languageCodes: codes
		}, function(err, r){
			if(err)
				return cb(err);

			const ret = {};

			codes.forEach(function(code, idx){
				ret[code] = r[idx];
			});

			cb(null, ret);
		});
	});
};

module.exports = AzureTranslator;