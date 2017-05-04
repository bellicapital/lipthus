"use strict";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const SchemaType = mongoose.SchemaType;
const Types = mongoose.Types;
const mongo = mongoose.mongo;
const BinDataFile = require('../bdf');
const GridFSFile = require('../../lib/gridfs').GridFSFile;
const GridStore = mongo.GridStore;

class FsList{
	constructor(val, type, collection, itemid, path, dbname) {
		Object.each(val, (i, v) => {
			if (v.constructor.name === 'ObjectID') {
				this[i] = new GridFSFile(v, new GridStore(mongoose.dbs[dbname]._conn.db, v, "r", {root: 'fs'}));

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

	keys()
	{
		return Object.keys(this);
	}

	/**
	 * Get the first element
	 * @returns {GridFSFile}
	 */
	getFirst()
	{
		const keys = this.keys();
		return keys[0] && this[keys[0]];
	}

	size()
	{
		return this.keys().length;
	}

	getThumb(width, height, crop)
	{
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
	toJSON()
	{
		const ret = {};

		Object.each(this, (k, v) => {
			ret[k] = v._id;
		});

		return ret;
	}

	info()
	{
		const ret = [];

		this.keys().forEach(k => {
			const info = this[k].info.apply(this[k], arguments);

			//Asegura la llave
			info.key = k;

			ret.push(info);
		});

		return ret;
	}

	loadFiles()
	{
		const files = [];
		const keys = this.keys();

		if (!keys.length)
			return Promise.resolve(files);

		const promises = keys.map(k => {
			if (this[k] instanceof BinDataFile) {
				files.push(this[k]);
			} else {
				return this[k].load()
					.then(gfsf => {
						if (gfsf)
							files.push(gfsf);
						else
						//file missing. tmp solution
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
	formDataValue()
	{
		const videoval = [];

		this.keys().forEach(k => {
			const obj = {
				id: this[k]._id
			};

			if(this[k].thumb)
				obj.thumbMD5 = this[k].thumb.md5;

			videoval.push(k + ':' + JSON.stringify(obj));
		});

		return videoval.join('|');
	}
}

/**
 * @deprecated
 */
FsList.prototype.toVideoVal = FsList.prototype.formDataValue;


class Fs extends SchemaType {
	constructor(key, options) {
		super(key, options);
	}

	//noinspection JSUnusedLocalSymbols
	/**
	 * Implement casting.
	 *
	 * @param {*} val
	 * @param {Object} [scope]
	 * @param {Boolean} [init]
	 * @return {mongo.Fs|FsList|null}
	 */

	cast(val, scope, init) {
		if (null === val) return val;
		if ('object' !== typeof val) return null;

//Para cuando se hace un update se valida sólo con el valor!!!!
		if (val.constructor.name === 'ObjectID')
			return val;

		if(val.MongoBinData)
			return BinDataFile.fromMongo(val);

		if (val instanceof FsList)
			return val;

		let ret;

		try {
			ret = new FsList(val, this.options.origType, this.collection, this.id, this.path, this.dbname);
		} catch (e) {
			throw new SchemaType.CastError('Fs', Object.keys(val), this.path);
		}

		return ret;
	}
}

const handleSingle = function(val){return this.cast(val);};
const handleExists = () => true;
const handleArray = function(val){return val.map(m => this.cast(m));};

Fs.prototype.$conditionalHandlers = {
	'$lt' : handleSingle
  , '$lte': handleSingle
  , '$gt' : handleSingle
  , '$gte': handleSingle
  , '$ne' : handleSingle
  , '$in' : handleArray
  , '$nin': handleArray
  , '$mod': handleArray
  , '$all': handleArray
	, '$exists' : handleExists
};

/**
 * Implement query casting, for mongoose 3.0
 *
 * @param {String} $conditional
 * @param {*} [value]
 */

Fs.prototype.castForQuery = function ($conditional, value) {
  if (2 === arguments.length) {
	let handler = this.$conditionalHandlers[$conditional];
	if (!handler)
		throw new Error("Can't use " + $conditional + " with Fs Type.");

	return handler.call(this, value);
  } else
	return this.cast($conditional);
};

/**
 * Expose
 */

module.exports.install = function(){
	Schema.Types.Fs = Fs;
	Types.Fs = mongo.FsType;
	return Fs;
};