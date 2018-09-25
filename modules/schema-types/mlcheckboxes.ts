import {Schema, SchemaType} from "mongoose";
import {LipthusRequest} from "../../index";
import {LipthusDb} from "../db";
import {KeyAny} from "../../interfaces/global.interface";


export class MlCheckbox {

	model = {options: {collection: ''}};

	constructor(public val: any, public path: string, public options: KeyAny, public schema?: any) {
	}

	getVal(req: LipthusRequest, db: LipthusDb) {
		db = db || req.db;

		if (!this.val || !this.val.length)
			return Promise.resolve();

		return this.checkLang(req, db)
			.then(o => {
				const ret: Array<string> = [];

				if (this.val)
					this.val.forEach((val: any) =>
						ret.push(o[val] ? o[val][req.ml.lang] || o[val][req.ml.configLang] : val));

				return ret;
			});
	}

	checkLang(req: LipthusRequest, db: LipthusDb): Promise<KeyAny> {
		const o = this.options.options;

		return new Promise((ok, ko) => {
			if (!req.ml.translateAvailable()) {
				Object.values(o).forEach((v: KeyAny) => {
					if (!v[req.ml.lang])
						v[req.ml.lang] = v[req.ml.configLang];
				});

				return ok(o);
			}

			const toTranslate = <any>[];
			const toTranslateKeys = <any>[];

			Object.each(o, (k, v) => {
				if (!v[req.ml.lang]) {
					toTranslate.push(v[req.ml.configLang]);
					toTranslateKeys.push(k);
				}
			});

			if (!toTranslate.length)
				return ok(o);

			if (!req.ml.translateAvailable())
				return ok();

			req.ml.translate(toTranslate, (err: Error, result: any) => {
				if (err)
					return ko(err);

				result.forEach((r: string, idx: number) => o[toTranslateKeys[idx]][req.ml.lang] = r);

				const query = {colname: this.model.options.collection.replace('dynobjects.', '')};
				const update: KeyAny = {};

				update['dynvars.' + this.path + '.options'] = o;

				db.dynobject.updateOne(query, update)
					.then(() => ok(o))
					.catch(ko);
			});
		});
	}

	toString() {
		return this.val;
	}

	toObject() {
		const ret: KeyAny = {};

		if (!this.val)
			return ret;

		this.val.forEach((val: string) => ret[val] = this.options.options[val]);

		return ret;
	}
}


export class MlCheckboxes extends SchemaType {

	public val: any;

	/**
	 *
	 * @param {String} path
	 * @param {Object} [options]
	 */
	constructor(public path: string, public options: any) {
		super(path, options, 'MlCheckboxesType');
	}

	// noinspection JSMethodCanBeStatic
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

	// default(val) {
	// 	return new MlCheckboxes(val);
	// }

	//noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
	/**
	 * Implement checkRequired method.
	 *
	 * @param {*} val
	 * @return {Boolean}
	 */

	checkRequired(val: any) {
		return !!(val && val.length);
	}

	/**
	 * Implement casting.
	 *
	 * @param {*} val
	 * @param {Object} [scope]
	 * @param init
	 * @return {any}
	 */

	cast(val: any, scope: any, init: boolean) {
		if (val instanceof MlCheckbox)
			return val;

		if (null === val || !Array.isArray(val)) return null;

		if (!init)
			return val;

		return new MlCheckbox(val, this.path, this.options, scope && scope.constructor.name === 'model' && scope.schema);
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

			if (!handler)
				throw new Error("Can't use " + $conditional + " with MlCheckboxes.");

			return handler.call(this, value);
		} else {
			if ('string' === typeof $conditional)
				return $conditional;
			else if ($conditional instanceof MlCheckboxes)
				return $conditional.val;
		}
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
	return val.map(m => typeof m === 'string' ? m : this.cast(m));
};


/**
 * Expose
 */
(Schema.Types as any).MlCheckboxes = MlCheckboxes;

export const MlCheckboxesType = MlCheckboxes;
