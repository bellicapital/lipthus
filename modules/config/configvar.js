"use strict";


const merge = require('merge-descriptors');
const MultilangText = require('../schema-types/mltext').MultilangText;


class ConfigVar {
	constructor(options, site) {
		this.title = '';
		this.desc = '';

		merge(this, options);

		this.formtype = this.formtype || 'text';

		if(site)
			Object.defineProperty(this, 'site', {value: site});

		this.setValue(this.value);
	}

	/**
	 * necesario para que se actualicen las propiedades definidas en config
	 * @returns {*}
	 */
	getValue() {
		return this.value;
	}

	setValue(v) {
		this.value = v;
	}

	get4Edit(req) {
		return Promise.resolve({
			id: this._id.toString(),
			name: this.name,
			value: this.value,
			formtype: this.formtype,
			caption: req.ml.get(this.title),
			description: req.ml.all[this.desc],
			options: this.options
		});
	}
}

class stringConfigVar extends ConfigVar{
	constructor(options) {
		super(options);
	}
}

class bdfConfigVar extends ConfigVar{
	constructor(options) {
		super(options);
	}
}

class pageConfigVar extends ConfigVar{
	constructor(options) {
		super(options);
	}
}

class themesetConfigVar extends ConfigVar{
	constructor(options) {
		super(options);
	}
}

class objectConfigVar extends ConfigVar{
	constructor(options) {
		super(options);

		this.formtype = 'object';
	}

	setValue(v) {
		if(typeof v === 'string')
			v = JSON.parse(v);

		this.value = v;
	}
}

class boolConfigVar extends ConfigVar{
	constructor(options) {
		super(options);
		this.formtype = 'boolean';
	}
}

class intConfigVar extends ConfigVar{
	constructor(options) {
		super(options);
	}

	setValue(v) {
		this.value = parseInt(v);
	}
}

class watermarkConfigVar extends ConfigVar{
	constructor(options) {
		super(options);
		this.formtype = 'watermark';
	}
}

class floatConfigVar extends ConfigVar{
	constructor(options) {
		super(options);
	}
}

class langConfigVar extends ConfigVar {
	constructor(options) {
		super(options);
		this.formtype = 'selector';
	}

	get4Edit(req) {
		return super.get4Edit(req)
			.then(ret => {
				return req.ml.availableLangNames()
					.then(langNames => {
						ret.options = langNames;

						return ret;
					});
			});
	}
}

class selectorConfigVar extends ConfigVar {
	constructor(options) {
		super(options);
		//this.formtype = 'selector';???? porqué no está???
	}

	get4Edit(req) {
		return super.get4Edit(req)
			.then(ret => {
				if (!Array.isArray(ret.options))
					return ret;

				return req.ml
					.load(['ecms-config', 'ecms-admin', 'ecms-comment'])
					.then(r => {
						ret.options.forEach((opt, idx) => {
							if (r[opt])
								ret.options[idx] = r[opt];
						});

						return ret;
					});
			});
	}
}

class multilangConfigVar extends ConfigVar {
	constructor(options, site) {
		super(options, site);
	}

	setValue(v) {
		this.value = v && new MultilangText(v, this.site.db.config.collection, 'value', this._id, this.site);
	}

	get4Edit(req) {
		return super.get4Edit(req)
			.then(ret => {
				ret.multilang = true;

				if (!ret.value || ret.value[0] !== '_')
					return ret;

				return req.ml.load(['ecms-config'], (err, r) => {
					if (r[ret.value])
						ret.value = r[ret.value];

					return ret;
				});
			});
	}
}


module.exports = function(options, site){
	const cl = eval(options.datatype + 'ConfigVar');

	return new cl(options, site);
};