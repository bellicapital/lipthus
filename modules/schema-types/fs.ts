import * as mongoose from "mongoose";
import {Schema, SchemaType, Types, mongo} from "mongoose";

const {BinDataFile} = require('../bdf');
const {GridFSFile} = require('../../lib');
const GridStore = (mongo as any).GridStore;

export class FsList {
	constructor(val: any, type: string, collection: string, itemid: Types.ObjectId, path: string, dbname: string) {
		Object.each(val, (i, v) => {
			if (v.constructor.name === 'ObjectID') {
				this[i] = new GridFSFile(v, new GridStore((mongoose as any).dbs[dbname]._conn.db, v, "r", {root: 'fs'}));
				
				if (type === 'video')
					this[i].folder = 'videos';
			} else if (v.MongoBinData) {
				this[i] = BinDataFile.fromMongo(v, {
					collection: collection,
					id: itemid,
					field: path + '.' + i
				});
			} else {
				throw new Error('No file found in ' + i);
			}
		});
	}
	
	keys() {
		return Object.keys(this);
	}
	
	/**
	 * Get the first element
	 * @returns {GridFSFile}
	 */
	getFirst() {
		const keys = this.keys();
		return keys[0] && this[keys[0]];
	}
	
	size() {
		return this.keys().length;
	}
	
	getThumb(width: number, height: number, crop: any) {
		const first = this.getFirst();
		
		if (!first) return;
		
		if (!width) width = 100;
		if (!height) height = 100;
		
		crop = crop === undefined || crop ? 1 : 0;
		
		return {
			width: width,
			height: height,
			contentType: 'image/jpeg',
			uri: '/videos/' + first._id + '/poster' + width + 'x' + height + 'k' + crop + '.jpg'
		};
	}
	
	//noinspection JSUnusedGlobalSymbols
	toJSON() {
		const ret = {};
		
		Object.each(this, (k, v) => {
			ret[k] = v._id;
		});
		
		return ret;
	}
	
	info() {
		const ret = <any>[];
		
		this.keys().forEach(k => {
			const info = this[k].info.apply(this[k], arguments);
			
			// Asegura la llave
			info.key = k;
			
			ret.push(info);
		});
		
		return ret;
	}
	
	loadFiles() {
		const files = <any>[];
		const keys = this.keys();
		
		if (!keys.length)
			return Promise.resolve(files);
		
		const promises = keys.map(k => {
			if (this[k] instanceof BinDataFile) {
				files.push(this[k]);
			} else {
				return this[k].load()
					.then((gfsf: any) => {
						if (gfsf)
							files.push(gfsf);
						else
						// file missing. tmp solution
							delete this[k];
					});
			}
		});
		
		return Promise.all(promises);
	}
	
	/**
	 * File value to include in form fields
	 * @returns {String}
	 */
	formDataValue() {
		const videoval = <any>[];
		
		this.keys().forEach(k => {
			const obj: any = {
				id: this[k]._id
			};
			
			if (this[k].thumb)
				obj.thumbMD5 = this[k].thumb.md5;
			
			videoval.push(k + ':' + JSON.stringify(obj));
		});
		
		return videoval.join('|');
	}
}


export class Fs extends SchemaType {
	
	collection?: string;
	dbname?: string;
	id?: Types.ObjectId;
	
	constructor(public path: string, public options: any) {
		super(path, options);
	}
	
	//noinspection JSUnusedLocalSymbols
	/**
	 * Implement casting.
	 *
	 * @param {*} val
	 * @param {Object} [scope]
	 * @param {Boolean} [init]
	 * @return {any}
	 */
	
	cast(val: any, scope?: any, init?: any) {
		if (null === val) return val;
		if ('object' !== typeof val) return null;
		
		// Para cuando se hace un update se valida sólo con el valor!!!!
		if (val.constructor.name === 'ObjectID')
			return val;
		
		if (val.MongoBinData)
			return BinDataFile.fromMongo(val);
		
		if (val instanceof FsList)
			return val;
		
		let ret;
		
		try {
			ret = new FsList(val, this.options.origType, this.collection!, this.id!, this.path, this.dbname!);
		} catch (e) {
			throw new (SchemaType as any).CastError('Fs', Object.keys(val), this.path);
		}
		
		return ret;
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
	
	castForQuery ($conditional: any, value: any) {
		if (2 === arguments.length) {
			const handler = this.$conditionalHandlers[$conditional];
			
			if (!handler)
				throw new Error("Can't use " + $conditional + " with Fs Type.");
			
			return handler.call(this, value);
		} else
			return this.cast($conditional);
	}
}

const handleSingle = function (this: any, val: any) {
	return this.cast(val);
};
const handleExists = () => true;
const handleArray = function (this: any, val: Array<any>) {
	return val.map(m => this.cast(m));
};

(Fs.prototype as any).$conditionalHandlers = {
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

/**
 * Implement query casting, for mongoose 3.0
 *
 * @param {String} $conditional
 * @param {*} [value]
 */

(Fs.prototype as any).castForQuery = function ($conditional: any, value: any) {
	if (2 === arguments.length) {
		const handler = this.$conditionalHandlers[$conditional];
		
		if (!handler)
			throw new Error("Can't use " + $conditional + " with Fs Type.");
		
		return handler.call(this, value);
	} else
		return this.cast($conditional);
};

/**
 * Expose
 */
(Schema.Types as any).Fs = Fs;
(Types as any).Fs = (mongo as any).FsType;

export {Fs as FsType};
