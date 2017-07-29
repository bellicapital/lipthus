"use strict";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const SchemaType = mongoose.SchemaType;


class MlSelector extends SchemaType {
	/**
	 *
	 * @param {String} key
	 * @param {Object} [options]
	 */
	constructor(key, options) {
		super(key, options, 'MlSelector');

		Object.defineProperty(this, '$conditionalHandlers', {
			value: {
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
			}
		});
	}

	//noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
	/**
	 * Implement checkRequired method.
	 *
	 * @param {*} val
	 * @return {Boolean}
	 */

	checkRequired(val) {
		return null !== val;
	}

	//noinspection JSUnusedGlobalSymbols,JSUnusedLocalSymbols
	/**
	 * Implement casting.
	 *
	 * @param {*} val
	 * @param {Object} [scope]
	 * @param {Boolean} [init]
	 * @return {mongo.Multilang|null}
	 */

	cast(val, scope, init) {
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

	castForQuery($conditional, value) {
		if (2 === arguments.length) {
			let handler = this.$conditionalHandlers[$conditional];
			if (!handler) {
				throw new Error("Can't use " + $conditional + " with MlSelector.");
			}
			return handler.call(this, value);
		} else {
			if ('string' === typeof $conditional)
				return $conditional;
			else if ($conditional instanceof MlSelector)
				return $conditional.val;
		}
	}

	getVal(req, db) {
		db = db || req.db;

		if (this.options.origType === 'nationality') {
			return db.nationalities.getList(req)
				.then(n => n[this.val]);
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

const handleSingle = function (val) {
	return this.cast(val);
};
const handleExists = () => true;
const handleArray = function (val) {
	return val.map(m => typeof m === 'string' ? m : this.cast(m));
};


/**
 * Expose
 */

module.exports.install = function () {
	Schema.Types.MlSelector = MlSelector;
	return MlSelector;
};