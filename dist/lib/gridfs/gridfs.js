"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const fs = require("fs");
const mongodb_1 = require("mongodb");
const gridfs_file_1 = require("./gridfs-file");
const debug0 = require("debug");
const gridfs_video_1 = require("./gridfs-video");
const node_fetch_1 = require("node-fetch");
const debug = debug0('site:gridfs');
const path = require('path');
const Mime = require('mime');
const multimedia = require('multimedia-helper');
class GridFS {
    constructor(db, ns = 'fs') {
        this.db = db;
        this.ns = ns;
        this.loaded = false;
        this.db = db;
    }
    static getMultimedia(filePath) {
        return multimedia(filePath)
            .catch((err) => debug(err));
    }
    get(id) {
        const _id = typeof id === 'string' ? mongoose_1.Types.ObjectId(id) : id;
        return new gridfs_file_1.GridFSFile(_id, this.db.lipthusDb);
    }
    getVideo(id) {
        if (typeof id === 'string')
            id = mongoose_1.Types.ObjectId(id);
        return new gridfs_video_1.GridFSVideo(id, this.db.lipthusDb);
    }
    findById(id) {
        return this.get(id).load();
    }
    // noinspection JSUnusedGlobalSymbols
    findVideoById(id) {
        return this.getVideo(id).load();
    }
    collection(cb) {
        this.db.collection(this.ns + '.files', cb);
    }
    find(q, o) {
        const args = arguments;
        return this.collection((err, collection) => {
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
    fromFile(file, fileOptions = {}) {
        return new Promise((ok, ko) => {
            if (typeof file === 'string') {
                const filePath = file;
                file = fs.statSync(file);
                file.path = filePath;
                file.type = Mime.getType(filePath);
                file.fileName = path.basename(filePath);
            }
            else {
                if (!file.fileName)
                    file.fileName = file.originalname;
                file.type = file.type || file.mimetype;
            }
            if (!fileOptions.uploadDate)
                fileOptions.uploadDate = new Date();
            GridFS.getMultimedia(file.path)
                .then(metadata => {
                if (metadata) {
                    delete metadata.title;
                    file.type = metadata.contentType;
                    fileOptions.metadata = metadata;
                    Object.assign(fileOptions, metadata);
                }
                const type = file.type.split('/');
                switch (type[0]) {
                    case 'video':
                        fileOptions.folder = 'videos';
                        break;
                    case 'audio':
                        fileOptions.folder = 'audios';
                        break;
                    default:
                        return;
                }
                const bucket = this.getBucket();
                fs.createReadStream(file.path)
                    .pipe(bucket.openUploadStream(file.fileName))
                    .on('error', ko)
                    .on('finish', (result) => {
                    this.get(result._id).load()
                        .then(gsFile => gsFile.update(fileOptions))
                        .then(ok, ko);
                });
            });
        });
    }
    getBucket() {
        return new mongodb_1.GridFSBucket(this.db, { bucketName: this.ns });
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     *  Deletes a file with the given id
     */
    deleteOne(id) {
        return this.getBucket().delete(id);
    }
    // noinspection JSUnusedGlobalSymbols
    async fromUrl(url, fileOptions = {}) {
        const fn = path.basename(url);
        const tmp = '/tmp/' + fn;
        debug('Fetching ' + url);
        const { body } = await node_fetch_1.default(url);
        await body.pipe(fs.createWriteStream(tmp));
        return this.fromFile(tmp, fileOptions);
    }
}
exports.GridFS = GridFS;
