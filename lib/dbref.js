"use strict";

const mongoose = require('mongoose');
const ObjectId = mongoose.mongo.ObjectId;
const DBRef = mongoose.mongo.DBRef;

DBRef.prototype.equals = function(r){
	return this.namespace === r.namespace && r.oid && r.oid.equals && this.oid.equals(r.oid) && this.db === r.db;
};

DBRef.prototype.toObject = function(){
	return {
		_bsontype: 'DBRef',
		namespace: this.namespace,
		oid: this.oid,
		db: this.db === null ? '' : this.db
	};
};

DBRef.prototype.fetch = function(db, cb){
	if(this.db)
		db = db.db(this.db);
	
	db[this.namespace].findById(this.oid, cb);
};

DBRef.cast = function(obj){
	if(!obj)
		return null;

	if(obj instanceof DBRef)
		return obj;

	if(obj instanceof Object)
		return DBRef.fromObject(obj);
};

DBRef.fromJSON = function(json){
	if(!json.$id)
		return;

	if(!(json.$id instanceof ObjectId))
		json.$id = ObjectId(json.$id);

	return new DBRef(json.$ref, json.$id, json.$db);
};

DBRef.fromObject = function(obj){
	if(obj.$id)
		return this.fromJSON(obj);

	return new DBRef(obj.namespace, obj.oid, obj.db);
};

DBRef.schema = {
	_bsontype: {type: String, default: 'DBRef'},
	namespace: String,
	oid: mongoose.Schema.Types.ObjectId,
	db: String
};

module.exports = DBRef;