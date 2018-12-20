import {BinDataFile} from "../bdf";
import {Schema, SchemaType} from "mongoose";
import {KeyAny} from "../../interfaces/global.interface";


export class BinDataFileList {
	/**
	 * First element
	 * @returns {BinDataFile}
	 */
	getFirst() {
		const keys = Object.keys(this);

		if (!keys.length)
			return;

		return Object.keys(this).map(key => (this as any)[key]).filter((im: any) => !im.hidden).sort((a, b) => a.weight - b.weight)[0];
	}

	getThumb(width: number, height: number, crop: boolean, enlarge: boolean) {
		const first = this.getFirst();

		return first ? first.info(width, height, crop === undefined ? true : crop, enlarge) : null;
	}

	info(width: number, height: number, crop: boolean, enlarge: boolean) {
		return Object.keys(this).map(key => (this as any)[key].info(width, height, crop, enlarge)).sort((a, b) => a.weight - b.weight);
	}

	toObject() {
		const ret = <any> [];
		const keys = Object.keys(this);

		keys.forEach(key => ret.push((this as any)[key]));

		return ret;
	}

	// noinspection JSUnusedGlobalSymbols
	formDataValue() {
		const arr = <any> [];

		Object.keys(this).forEach(key => arr.push(key + ':' + (this as any)[key].name || (this as any)[key]));

		return arr.join('|');
	}

	size() {
		return Object.keys(this).length;
	}
}

export class BdfList extends SchemaType {

	collection!: string;
	id!: string;
	path?: string;
	public dbname!: string;

	constructor(key: string, options: any) {
		super(key, options);
	}

	//noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
	checkRequired(val: any) {
		return null !== val;
	}

	// noinspection JSUnusedLocalSymbols
	/**
	 * Implement casting.
	 *
	 * @param {*} val
	 * @param {Object} [scope]
	 * @param {Boolean} [init]
	 * @return {*}
	 */

	cast(val: any, scope?: any, init?: any) {
		if (null === val) return val;
		if ('object' !== typeof val) return null;
		if (val instanceof BinDataFile) return val; // Necesario para cuando se hace un update individual

		// if (!init)
		// 	return val;

		const retTmp: KeyAny = {};
		const ret = new BinDataFileList;
		const w: Array<string> = [];

		Object.keys(val).forEach(i => {
			if (val[i].MongoBinData) {
				w.push(i);

				if (val[i] instanceof BinDataFile)
					retTmp[i] = val[i];
				else
					retTmp[i] = BinDataFile.fromMongo(val[i], {
						db: this.dbname,
						collection: this.collection,
						id: this.id,
						field: this.path + '.' + i
					});

				retTmp[i].key = i;
			}
		});

		// Sort by weight
		w.sort((a, b) => retTmp[a].weight - retTmp[b].weight);

		w.forEach(k => (ret as any)[k] = retTmp[k]);

		return ret;
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
			const handler: any = (this.$conditionalHandlers as any)[$conditional];

			if (!handler)
				throw new Error("Can't use " + $conditional + " with BdfList Type.");

			return handler.call(this, value);
		} else
			return this.cast($conditional);
	}
}

(BdfList as any).BinDataFileList = BinDataFileList;

const handleSingle = function (this: any, val: any) {
	return this.cast(val);
};
const handleExists = (r: boolean) => r;
const handleArray = function (this: any, val: Array<any>) {
	return val.map((m: any) => this.cast(m));
};


/**
 * Expose
 */
(Schema.Types as any).BdfList = BdfList;
