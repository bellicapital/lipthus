import * as mongoose from "mongoose";
import {Schema, SchemaType, Types, mongo} from "mongoose";
import {GridFSFile} from "../../lib";
import {BinDataFile} from "../bdf";
import {KeyAny} from "../../interfaces/global.interface";

export class FsList {
	constructor(val: any, type: string, collection: string, itemId: Types.ObjectId, path: string, dbname: string) {
		Object.each(val, (i, v) => {
			if (v.constructor.name === 'ObjectID') {
				(this as any)[i] = new GridFSFile(v, (mongoose as any).dbs[dbname].lipthusDb);
				
				if (type === 'video')
					(this as any)[i].folder = 'videos';
			} else if (v.MongoBinData) {
				(this as any)[i] = BinDataFile.fromMongo(v, {
					collection: collection,
					id: itemId,
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
		return keys[0] && (this as any)[keys[0]];
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
		const ret: KeyAny = {};
		
		Object.keys(this).forEach(k => ret[k] = (this as any)[k]._id);
		
		return ret;
	}
	
	info() {
		const ret = <any>[];
		
		this.keys().forEach(k => {
			const info = (this as any)[k].info.apply((this as any)[k], arguments);
			
			// Ensure key
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
			if ((this as any)[k] instanceof BinDataFile) {
				files.push((this as any)[k]);
			} else {
				return (this as any)[k].load()
					.then((gfsf: any) => {
						if (gfsf)
							files.push(gfsf);
						else
						// file missing. tmp solution
							delete (this as any)[k];
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
				id: (this as any)[k]._id
			};
			
			if ((this as any)[k].thumb)
				obj.thumbMD5 = (this as any)[k].thumb.md5;
			
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
	
	// noinspection JSUnusedGlobalSymbols
	castForQuery ($conditional: any, value: any) {
		if (2 === arguments.length) {
			const handler = (this.$conditionalHandlers as any)[$conditional];
			
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


/**
 * Expose
 */
(Schema.Types as any).Fs = Fs;
(Types as any).Fs = (mongo as any).FsType;

export {Fs as FsType};
