"use strict";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const SchemaType = mongoose.SchemaType;
const Types = mongoose.Types;
const mongo = mongoose.mongo;
const BinDataFile = require('../bdf');


class Bdf extends SchemaType {
	constructor(key, options) {
		super(key, options);
	}

	//noinspection JSMethodCanBeStatic
	checkRequired(val) {
		return null !== val;
	}

	/**
	 * Implement casting.
	 *
	 * @param {*} val
	 * @param {Object} [scope]
	 * @param {Boolean} [init]
	 * @return {mongo.Bdf|null}
	 */

	cast(val, scope, init) {
		if (null === val) return val;
		if ('object' !== typeof val) return null;

		if (val instanceof BinDataFile)
			return val;

		if (val.MongoBinData) {
			return BinDataFile.fromMongo(val, {
				collection: this.collection,
				id: this.id,
				field: this.path
			});
		}

		throw new SchemaType.CastError('Bdf', val);
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
		}
	}

	/**
	 * Implement query casting, for mongoose 3.0
	 *
	 * @param {String} $conditional
	 * @param {*} [value]
	 */

	castForQuery($conditional, value) {
		if (2 === arguments.length) {
			let handler = this.$conditionalHandlers[$conditional];
			if (!handler)
				throw new Error("Can't use " + $conditional + " with Bdf Type.");

			return handler.call(this, value);
		} else {
			return this.cast($conditional);
		}
	}
}

const handleSingle = val => this.cast(val);
const handleArray = val => val.map(m => this.cast(m));

module.exports.install = function(){
	Schema.Types.Bdf = Bdf;
	Types.Bdf = mongo.BdfType;
	return Bdf;
};