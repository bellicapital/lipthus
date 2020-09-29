"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBRef = void 0;
const mongoose_1 = require("mongoose");
const ObjectId = mongoose_1.mongo.ObjectId;
exports.DBRef = mongoose_1.mongo.DBRef;
const proto = exports.DBRef.prototype;
proto.equals = function (r) {
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
proto.fetch = function (db, cb) {
    if (this.db)
        db = db.db(this.db);
    db[this.namespace].findById(this.oid, cb);
};
exports.DBRef.cast = function (obj) {
    if (!obj)
        return null;
    if (obj instanceof exports.DBRef)
        return obj;
    if (obj instanceof Object)
        return exports.DBRef.fromObject(obj);
};
exports.DBRef.fromJSON = function (json) {
    if (!json.$id)
        return;
    if (!(json.$id instanceof ObjectId))
        json.$id = new ObjectId(json.$id);
    return new exports.DBRef(json.$ref, json.$id, json.$db);
};
exports.DBRef.fromObject = function (obj) {
    if (obj.$id)
        return this.fromJSON(obj);
    return new exports.DBRef(obj.namespace, obj.oid, obj.db);
};
exports.DBRef.schema = {
    _bsontype: { type: String, default: 'DBRef' },
    namespace: String,
    oid: mongoose_1.Schema.Types.ObjectId,
    db: String
};
