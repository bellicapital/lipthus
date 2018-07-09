import {Schema, SchemaType} from "mongoose";
import {BinDataFile} from "../bdf";


export class Bdf extends SchemaType {

	public collection!: string;
	public id!: string;
	public dbname!: string;

	constructor(public path: string, public options: any) {
		super(path, options);
	}

	//noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
	checkRequired(val: any) {
		return null !== val;
	}


	// noinspection JSUnusedLocalSymbols
	cast(val: any, scope?: any, init?: any) {
		if (null === val) return val;
		if ('object' !== typeof val) return null;

		if (val instanceof BinDataFile)
			return val;

		if (val.MongoBinData) {
			return BinDataFile.fromMongo(val, {
				db: this.dbname,
				collection: this.collection,
				id: this.id,
				field: this.path
			});
		}

		throw new (SchemaType as any).CastError('Bdf', val);
	}


	//noinspection JSMethodCanBeStatic
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
				throw new Error("Can't use " + $conditional + " with Bdf Type.");

			return handler.call(this, value);
		} else {
			return this.cast($conditional);
		}
	}
}

const handleSingle = function (this: any, val: any) {
	return this.cast(val);
};
const handleExists = () => true;
const handleArray = function (this: any, val: Array<any>) {
	return val.map(m => this.cast(m));
};

(Schema.Types as any).Bdf = Bdf;

export {Bdf as BdfType};
