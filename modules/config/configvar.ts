import {Site} from "../site";
import {LipthusRequest} from "../../index";
import {Types} from "mongoose";
import ObjectId = Types.ObjectId;

const {MultilangText} = require('../schema-types/mltext');


export class ConfigVar {

	public _id: ObjectId;
	public title = '';
	public name = '';
	public desc = '';
	// noinspection SpellCheckingInspection
	public formtype = 'text';
	public value: any;
	public options: any;

	constructor(options: any, public site: Site) {
		this._id = options._id;
		Object.assign(this, options);

		this.setValue(this.value);
	}

	/**
	 * necesario para que se actualicen las propiedades definidas en config
	 * @returns {*}
	 */
	getValue() {
		return this.value;
	}

	setValue(v: any) {
		this.value = v;
	}

	get4Edit(req: LipthusRequest) {
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

class StringConfigVar extends ConfigVar {}

class FloatConfigVar extends ConfigVar {}

class BdfConfigVar extends ConfigVar {}

class PageConfigVar extends ConfigVar {}

class ObjectConfigVar extends ConfigVar {

	public formtype = 'object';

	setValue(v: string | any) {
		if (typeof v === 'string')
			v = JSON.parse(v);

		this.value = v;
	}
}

class BoolConfigVar extends ConfigVar {
	public formtype = 'boolean';
}

class IntConfigVar extends ConfigVar {

	setValue(v: any) {
		this.value = parseInt(v, 10);
	}
}

class WatermarkConfigVar extends ConfigVar {
	public formtype = 'watermark';
}

class LangConfigVar extends ConfigVar {
	public formtype = 'selector';

	setValue(v: any) {
		this.value = v;
	}

	get4Edit(req: LipthusRequest) {
		return super.get4Edit(req)
			.then(ret => {
				return req.ml.availableLangNames()
					.then((langNames: any) => {
						ret.options = langNames;

						return ret;
					});
			});
	}
}

class SelectorConfigVar extends ConfigVar {

	get4Edit(req: LipthusRequest) {
		return super.get4Edit(req)
			.then(ret => {
				if (!Array.isArray(ret.options))
					return ret;

				return req.ml
					.load(['ecms-config', 'ecms-admin', 'ecms-comment'])
					.then((r: any) => {
						ret.options.forEach((opt: any, idx: number) => {
							if (r[opt])
								ret.options[idx] = r[opt];
						});

						return ret;
					});
			});
	}
}

export class MultilangConfigVar extends ConfigVar {

	setValue(v?: any) {
		this.value = v && new MultilangText(v, this.site.db.config.collection, 'value', this._id, this.site);
	}

	get4Edit(req: LipthusRequest) {
		return super.get4Edit(req)
			.then((ret: any) => {
				ret.multilang = true;

				if (!ret.value || ret.value[0] !== '_')
					return ret;

				return req.ml.load(['ecms-config'])
					.then((r: any) => {
						if (r[ret.value])
							ret.value = r[ret.value];

						return ret;
					});
			});
	}
}


export const ConfigVarInstance: (options: any, site: Site) => (any) = function (options: any, site: Site) {
	switch (options.datatype) {
		case 'selector':
			return new SelectorConfigVar(options, site);
		case 'multilang':
			return new MultilangConfigVar(options, site);
		case 'string':
			return new StringConfigVar(options, site);
		case 'float':
			return new FloatConfigVar(options, site);
		case 'bdf':
			return new BdfConfigVar(options, site);
		case 'page':
			return new PageConfigVar(options, site);
		case 'object':
			return new ObjectConfigVar(options, site);
		case 'bool':
			return new BoolConfigVar(options, site);
		case 'int':
			return new IntConfigVar(options, site);
		case 'watermark':
			return new WatermarkConfigVar(options, site);
		case 'lang':
			return new LangConfigVar(options, site);

	}
	// const cl = eval(options.datatype.replace(/^(\w)/, (a: string) => a.toUpperCase()) + 'ConfigVar');
	//
	// return new cl(options, site);
};
