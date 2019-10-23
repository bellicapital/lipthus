"use strict";
const { GridFSFile } = require('../lib');
module.exports = function fsfiles(Schema) {
    const s = new Schema({
        filename: String,
        contentType: String,
        folder: String,
        length: Number,
        chunkSize: Number,
        uploadDate: Date,
        md5: String,
        metadata: {},
        items: [{
                $ref: String,
                $id: Schema.Types.ObjectId,
                $db: String
            }],
        processLog: {},
        versions: {
            mp4: {},
            webm: {}
        },
        thumb: {},
        submitter: { type: Schema.Types.ObjectId, ref: 'user' },
        parent: { type: Schema.Types.ObjectId, ref: 'fsfiles' }
    }, {
        collection: 'fs.files',
        created: true
    });
    s.statics = {
        check: function (repair) {
            const ret = {
                videos: 0,
                versions: 0,
                versioned: 0,
                unversioned: 0,
                orphanVersions: 0,
                wrongParents: 0,
                missingVersions: 0,
                errorVersions: 0
            };
            const versioned = {};
            return this.find({ folder: 'videos' })
                .select('versions items')
                .populate('versions.mp4 versions.webm', '_id')
                .then(videos => {
                ret.videos = videos.length;
                const prom = [];
                let vv;
                videos.forEach(v => {
                    GridFSFile.videoExt.forEach(ext => {
                        if (!v.versions[ext]) {
                            ret.unversioned++;
                            if (repair && !vv) {
                                vv = true; //sólo una versión por cada ejecución
                                prom.push(v.createVideoVersion(ext, true));
                            }
                        }
                        else {
                            versioned[v.versions[ext]._id] = true;
                            const p = this.findById(v.versions[ext]._id)
                                .select('folder parent')
                                .then(version => {
                                if (!version)
                                    return ret.missingVersions++;
                                if (version.folder !== 'videoversions' || !version.parent.equals(v._id)) {
                                    ret.errorVersions++;
                                    if (repair)
                                        return version.set({ folder: 'videoversions', parent: v._id }).save();
                                }
                            });
                            prom.push(p);
                        }
                    });
                });
                return Promise.all(prom);
            })
                .then(() => this.find({ folder: 'videoversions' }, 'parent').populate('parent', '_id'))
                .then(versions => {
                ret.versions = versions.length;
                versions.forEach(function (v) {
                    if (!v.parent)
                        ret.orphanVersions++;
                    else if (!versioned[v._id])
                        ret.wrongParents++;
                });
                ret.versioned = Object.keys(versioned).length;
                return ret;
            });
        },
        repair: function () {
            let vv;
            const versioned = {};
            this.find({ folder: 'videos' }, 'versions items')
                .populate('versions.mp4 versions.webm', '_id')
                .then(videos => {
                videos.forEach(function (v) {
                    GridFSFile.videoExt.forEach(function (ext) {
                        if (!v.versions[ext]) {
                            if (!vv) {
                                vv = true; //sólo una versión por cada ejecución
                                v.createVideoVersion(ext, true, function (err) {
                                    if (err)
                                        console.error(err);
                                });
                            }
                        }
                        else
                            versioned[v.versions[ext]._id] = true;
                    });
                });
            })
                .then(() => {
                return this
                    .find({ folder: 'videoversions' }, 'parent')
                    .populate('parent', '_id')
                    .then(versions => {
                    versions.forEach(function (v) {
                        if (!v.parent || !versioned[v._id])
                            v.unlink();
                    });
                })
                    .then(this.check.bind(this));
            });
        }
    };
    s.methods = {
        getItems: function (fields) {
            if (!this.items || !this.items.length)
                return Promise.resolve([]);
            let db;
            const thisDb = this.db.lipthusDb;
            const dbs = this.db.lipthusDb.site.dbs;
            const items = this.get('items') || [];
            const ret = [];
            const p = items.map(item => {
                item = item.toObject();
                db = item.db ? dbs[item.db] : thisDb;
                return db[item.namespace.replace('dynobjects.', '')]
                    .findById(item.oid)
                    .select(fields)
                    .then(r => r && ret.push(r));
            });
            return Promise.all(p).then(() => ret);
        },
        unlink: function () {
        },
        /**
         *
         * @returns {Promise}
         */
        fsFile: function () {
            return this.db.lipthusDb.fs.get(this._id).load();
        },
        createVideoVersion: function (ext, force) {
            return this.fsFile()
                .then(file => file.createVideoVersion(ext, force));
        },
        /**
         *
         * @returns {Promise}
         */
        chunksCount: function () {
            return this.db.collection('fs.chunks').countDocuments({ files_id: this._id });
        }
    };
    return s;
};
