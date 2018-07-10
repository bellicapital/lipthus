"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const fs = require("fs");
const util = require("util");
const gridfs_file_1 = require("./gridfs-file");
const GridStore = require('mongodb').GridStore;
const Mime = require('mime');
class GridFS {
    constructor(db, ns = GridStore.DEFAULT_ROOT_COLLECTION) {
        this.db = db;
        this.ns = ns;
        this.loaded = false;
        this.db = db;
        this.ns = ns || GridStore.DEFAULT_ROOT_COLLECTION;
    }
    get(id) {
        if (typeof id === 'string')
            id = mongoose_1.Types.ObjectId(id);
        return new gridfs_file_1.GridFSFile(id, new GridStore(this.db, id, "r", { root: this.ns }));
    }
    findById(id) {
        return this.get(id).load();
    }
    collection(cb) {
        this.db.collection(this.ns + '.files', cb);
    }
    find() {
        const args = arguments;
        this.collection((err, collection) => {
            if (err)
                return args[args.length - 1]();
            collection.find.apply(collection, args);
        });
    }
    findOneField(id, field) {
        return new Promise((ok, ko) => {
            if (this.loaded)
                return ok(this[field]);
            this.collection((err, collection) => {
                if (err)
                    return ko(err);
                const fields = {};
                fields[field] = 1;
                collection.findOne({ _id: mongoose_1.Types.ObjectId(id) }, fields, (err2, obj) => {
                    this.err = err2;
                    if (err2)
                        return ko(err2);
                    if (!obj)
                        return ok();
                    ok(obj[field]);
                });
            });
        });
    }
    fromFile(file) {
        return new Promise((ok, ko) => {
            if (typeof file === 'string') {
                const path = file;
                file = util.inspect(fs.statSync(file));
                file.path = path;
                file.type = Mime.lookup(path);
                file.fileName = path.basename(path);
            }
            else if (!file.fileName)
                file.fileName = file.originalname;
            const id = new mongoose_1.Types.ObjectId();
            const gs = new GridStore(this.db, id, file.fileName, "w", { root: this.ns, content_type: file.type || file.mimetype });
            gs.open((err, gs2) => {
                if (err)
                    return ko(err);
                gs2.writeFile(file.path, (err2, doc) => {
                    if (err2)
                        return ko(err2);
                    ok(doc);
                });
            });
        });
    }
}
exports.GridFS = GridFS;
