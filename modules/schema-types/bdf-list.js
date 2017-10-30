"use strict";

const BinDataFile = require('../bdf');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const SchemaType = mongoose.SchemaType;

class BinDataFileList
{
	/**
	 * First element
	 * @returns {BinDataFile}
	 */
	getFirst()
	{
		const keys = Object.keys(this);
		
		if(!keys.length)
			return;
		
		return Object.keys(this).map(key => this[key]).sort((a, b) => a.weight - b.weight)[0];
	}

	getThumb(width, height, crop, enlarge)
	{
		const first = this.getFirst();

		return first ? first.info(width, height, crop === undefined ? true : crop, enlarge) : null;
	}

	info(width, height, crop, enlarge)
	{
		return Object.keys(this).map(key => this[key].info(width, height, crop, enlarge)).sort((a, b) => a.weight - b.weight);
	}

	toObject()
	{
		const ret = [];
		const keys = Object.keys(this);

		keys.forEach(key => ret.push(this[key]));

		return ret;
	}

	formDataValue()
	{
		const arr = [];

		Object.keys(this).forEach(key => arr.push(key + ':' + this[key].name || this[key]));

		return arr.join('|');
	}

	size()
	{
		return Object.keys(this).length;
	}
}

class BdfList extends SchemaType {
	constructor(key, options) {
		super(key, options);
	}
	
	//noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
	checkRequired(val) {
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

	cast(val, scope, init) {
		if (null === val) return val;
		if ('object' !== typeof val) return null;
		if (val instanceof BinDataFile) return val;//Necesario para cuando se hace un update individual

		//if (!init)
		//	return val;

		const retTmp = {};
		const ret = new BinDataFileList;
		const w = [];

		Object.keys(val).forEach(i => {
			if (val[i].MongoBinData) {
				w.push(i);

				if (val[i] instanceof BinDataFile)
					retTmp[i] = val[i];
				else
					retTmp[i] = BinDataFile.fromMongo(val[i], {
						collection: this.collection,
						id: this.id,
						field: this.path + '.' + i
					});

				retTmp[i].key = i;
			}
		});

		//Sort by weight
		w.sort(function (a, b) {
			return retTmp[a].weight - retTmp[b].weight;
		});

		w.forEach(function (k) {
			ret[k] = retTmp[k];
		});

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
			, '$exists' : handleExists
		};
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Implement query casting, for mongoose 3.0
	 *
	 * @param {String} $conditional
	 * @param {*} [value]
	 */

	castForQuery ($conditional, value) {
		if (2 === arguments.length) {
			let handler = this.$conditionalHandlers[$conditional];
			if (!handler)
				throw new Error("Can't use " + $conditional + " with BdfList Type.");

			return handler.call(this, value);
		} else
			return this.cast($conditional);
	}
}

BdfList.BinDataFileList = BinDataFileList;

const handleSingle = function(val){return this.cast(val);};
const handleExists = () => true;
const handleArray = function(val){return val.map(m => this.cast(m));};


module.exports.install = function(){

	/**
	 * Expose
	 */

	Schema.Types.BdfList = BdfList;

	return BdfList;
};