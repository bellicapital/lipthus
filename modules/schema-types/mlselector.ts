import {Schema, SchemaType} from "mongoose";
import {LipthusRequest} from "../../index";
import {LipthusDb} from "../db";


export class MlSelector extends SchemaType {
	
	public val: any;
	
	/**
	 *
	 * @param {String} path
	 * @param {Object} [options]
	 */
	constructor(public path: string, public options: any) {
		super(path, options, 'MlSelector');
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
	
	//noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
	/**
	 * Implement checkRequired method.
	 *
	 * @param {*} val
	 * @return {Boolean}
	 */
	
	checkRequired(val: any) {
		return null !== val;
	}
	
	//noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
	/**
	 * Implement casting.
	 *
	 * @param {*} val
	 * @param {Object} [scope]
	 * @param {Boolean} [init]
	 * @return {any}
	 */
	
	cast(val: any, scope: any, init: any) {
		if (null === val || val instanceof MlSelector) return val;
		
		const ret = new MlSelector(this.path, this.options);
		
		ret.val = val;
		
		return ret;
	}
	
	
	//noinspection JSUnusedGlobalSymbols
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
				throw new Error("Can't use " + $conditional + " with MlSelector.");
			
			return handler.call(this, value);
		} else {
			if ('string' === typeof $conditional)
				return $conditional;
			else if ($conditional instanceof MlSelector)
				return $conditional.val;
		}
	}
	
	getVal(req: LipthusRequest, db: LipthusDb) {
		db = db || req.db;
		
		if (this.options.origType === 'nationality') {
			return db.nationalities.getList(req)
				.then((n: any) => n[this.val]);
		} else
			return Promise.resolve(this.val);
	}
	
	toString() {
		return this.val;
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
(Schema.Types as any).MlSelector = MlSelector;

export const MlSelectorType = MlSelector;
