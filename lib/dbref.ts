import {mongo, Schema} from "mongoose";

const ObjectId = mongo.ObjectId;
export const DBRef: any = mongo.DBRef;
const proto: any = DBRef.prototype;

proto.equals = function (r: any) {
	return this.namespace === r.namespace && r.oid && r.oid.equals && this.oid.equals(r.oid) && this.db === r.db;
};

proto.toObject = function () {
	return {
		_bsontype: 'DBRef',
		namespace: this.namespace,
		oid: this.oid,
		db: this.db === null ? '' : this.db
	};
};

proto.fetch = function (db: any, cb?: any) {
	if (this.db)
		db = db.db(this.db);
	
	db[this.namespace].findById(this.oid, cb);
};

DBRef.cast = function (obj: any) {
	if (!obj)
		return null;
	
	if (obj instanceof DBRef)
		return obj;
	
	if (obj instanceof Object)
		return DBRef.fromObject(obj);
};

DBRef.fromJSON = function (json: any) {
	if (!json.$id)
		return;
	
	if (!(json.$id instanceof ObjectId))
		json.$id = new ObjectId(json.$id);
	
	return new DBRef(json.$ref, json.$id, json.$db);
};

DBRef.fromObject = function (obj: any) {
	if (obj.$id)
		return this.fromJSON(obj);
	
	return new DBRef(obj.namespace, obj.oid, obj.db);
};

DBRef.schema = {
	_bsontype: {type: String, default: 'DBRef'},
	namespace: String,
	oid: Schema.Types.ObjectId,
	db: String
};
