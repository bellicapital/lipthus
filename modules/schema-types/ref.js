//usado en clubmanager!!!
//TODO: revisar si es necesario y tratar de eliminar


"use strict";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const SchemaType = mongoose.SchemaType;
const Types = mongoose.Types;
const mongo = mongoose.mongo;

module.exports.install = function(){

	function Ref(key, options) {
		console.warn('Schema type ref is @deprecated. jj');
		SchemaType.call(this, key, options);
	}
	
	Ref.prototype.__proto__ = SchemaType.prototype;

	Ref.prototype.checkRequired = function (val) {
		return null !== val;
	};

  /**
   * Implement casting.
   *
   * @param {String} val
   * @param {Object} [scope]
   * @param {Boolean} [init]
   * @return {mongo.Ref|null}
   */

  Ref.prototype.cast = function (val, scope, init){
    if (null === val) return val;
    if ('object' !== typeof val) return val;//No usar null porque no funciona al actualizar con findOneAndUpdate, etc...

//    if (val instanceof BinDataFile)
//      return val;

	if(val.schema && val.id)
		return new FieldRef(val);
	
	throw new SchemaType.CastError('Ref', val);
  };

  /*!
   * ignore
   */
const handleSingle = val => this.cast(val);
const handleArray = val => val.map(m => this.cast(m));


	Ref.prototype.$conditionalHandlers = {
		'$lt' : handleSingle
	  , '$lte': handleSingle
	  , '$gt' : handleSingle
	  , '$gte': handleSingle
	  , '$ne' : handleSingle
	  , '$in' : handleArray
	  , '$nin': handleArray
	  , '$mod': handleArray
	  , '$all': handleArray
	};

	/**
	 * Implement query casting, for mongoose 3.0
	 *
	 * @param {String} $conditional
	 * @param {*} [value]
	 */

	Ref.prototype.castForQuery = function ($conditional, value) {
	  if (2 === arguments.length) {
		const handler = this.$conditionalHandlers[$conditional];
		if (!handler)
			throw new Error("Can't use " + $conditional + " with Ref Type.");

		return handler.call(this, value);
	  } else
		return this.cast($conditional);
	};
	
	
	function FieldRef(val){
		this.schema = val.schema;
		this.id = Schema.Types.ObjectId.prototype.cast(val.id);
		this.field = val.field;
	}

	/**
	 * Expose
	 */

	Schema.Types.Ref = Ref;
	Types.Ref = mongo.Ref;
	return Ref;
};