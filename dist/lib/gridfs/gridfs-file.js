"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const file_info_1 = require("./file-info");
const mongoose_1 = require("mongoose");
const path = require("path");
const child_process_1 = require("child_process");
const modules_1 = require("../../modules");
const md5 = require("md5");
const debug0 = require("debug");
const lipthus_error_1 = require("../../classes/lipthus-error");
const optimage_1 = require("../optimage");
const fs = require("fs");
const util_1 = require("util");
const express_mongo_stream_1 = require("express-mongo-stream");
const multimedia = require('multimedia-helper');
const fsp = require('mz/fs');
const debug = debug0('site:gridfs-file');
const pExec = util_1.promisify(child_process_1.exec);
let tmpdir = require('os').tmpdir();
if (tmpdir.substr(-1) !== '/')
    tmpdir += '/';
const videoExt = ['mp4', 'webm'];
class GridFSFile {
    constructor(_id, db) {
        this._id = _id;
        this.db = db;
        this.length = 0;
        this.contentType = '';
        this.loaded = false;
        this.processLog = {};
    }
    static get videoExt() {
        return videoExt;
    }
    get id() {
        return this._id;
    }
    getBucket() {
        return this.db.fs.getBucket();
    }
    mTime() {
        if (this.mtime && this.mtime.getTime() !== 0)
            return this.mtime;
        if (!this.uploadDate)
            this.uploadDate = new Date();
        return this.uploadDate;
    }
    get databaseName() {
        return this.db.name;
    }
    get namespace() {
        return this.db.fs.ns;
    }
    get collection() {
        return this.db.collection(this.namespace);
    }
    info(full = false) {
        const ret = new file_info_1.FileInfo({
            id: this._id + '',
            uri: '/' + this.namespace + '/' + this._id,
            db: this.databaseName
        });
        if (this.filename) { // loaded
            ret.uri += '/' + this.filename;
            ret.name = this.filename;
            ret.basename = this.basename();
            ret.size = this.length;
            ret.key = this.getKey();
            ret.lastModifiedDate = this.mTime();
            ret.contentType = this.contentType;
            if (this.error)
                ret.error = this.error;
            if (this.metadata) {
                Object.assign(ret, this.metadata);
                if (this.folder === 'videos') {
                    ret.thumb = '/videos/' + this.databaseName + '.' + this._id + '/poster.jpg';
                    ret.versions = {};
                    videoExt.forEach(ext => {
                        ret.versions[ext] = '/videos/' + this.databaseName + '.' +
                            (this.versions && this.versions[ext] ? this.versions[ext]._id : this._id) + '/' + ret.basename + '.' + ext;
                    });
                }
            }
            else if (this.thumb)
                ret.thumb = '/bdf/fs/' + this._id + '/thumb/' + ret.basename + '.jpg';
            else if (!this.error && !this.contentType.indexOf('video'))
                ret.error = new Error('video conversion error');
            if (this.thumb && this.thumb.uploadDate)
                ret.thumbTS = this.thumb.uploadDate.getTime();
            if (full) {
                ret.folder = this.folder;
                ret.md5 = this.md5;
                ret.submitter = this.submitter || undefined;
            }
        }
        else if (this.loaded)
            ret.error = this.error;
        return ret;
    }
    send(req, res) {
        return this.load()
            .then(() => {
            if (!this.contentType)
                throw 404;
            const params = {
                id: this.id,
                contentType: this.contentType,
                length: this.length,
                mtime: this.mTime(),
                disposition: req.query.dl ? 'attachment' : 'inline',
                duration: this.metadata && this.metadata.duration
            };
            return express_mongo_stream_1.expressMongoStream(params, this.db._conn.db, req, res);
        })
            .catch((err) => {
            if (err.message === 'File does not exist')
                err.status = 404;
            return Promise.reject(err);
        });
    }
    toString() {
        let ret = '/' + this.namespace + '/' + this._id;
        if (this.loaded)
            ret += '/' + this.filename;
        return ret;
    }
    load() {
        if (this.loaded)
            return Promise.resolve(this);
        this.loaded = true;
        if (!this._id)
            return Promise.reject(new Error('No id!'));
        return this.getBucket().find({ _id: this._id }).toArray()
            .then((r) => {
            if (!r.length)
                return this.setNotFound();
            const obj = r[0];
            Object.keys(obj).forEach(i => this[i] = obj[i]);
            if (this.thumb)
                this.thumb = modules_1.BinDataFile.fromMongo(this.thumb, {
                    collection: this.namespace + '.files',
                    id: this._id,
                    field: 'thumb',
                    db: this.databaseName
                });
            return this.getMetadata()
                .then(() => {
                if (this.metadata && this.folder === 'videos')
                    this.setVideoVersions();
            });
        })
            .then(() => this);
    }
    setNotFound() {
        this.error = new GridFSFileNotFoundError('File not found ' + this._id);
    }
    getVideoVersion(k, force) {
        if (videoExt.indexOf(k) === -1)
            return Promise.reject(new Error('Version ' + k + ' not implemented'));
        return this.load()
            .then(() => {
            if (this.folder !== 'videos')
                throw new Error(this._id + ' is not a video main file');
            if (!this.versions)
                this.versions = {};
            if (this.versions[k] && !force)
                return this.versions[k];
            return this.checkVideoVersion(k, force);
        });
    }
    setVideoVersions() {
        videoExt.forEach(k => {
            if (this.versions && this.versions[k]) {
                this.versions[k] = new GridFSFile(this.versions[k], this.db);
                this.versions[k].folder = 'videoversions';
                // } else {
                // 	this.createVideoVersion(k);
            }
        });
    }
    checkVideoVersion(k, force) {
        if (this.versions && this.versions[k])
            return this.versions[k].load();
        else
            return this.createVideoVersion(k, force);
    }
    getMetadata() {
        if (this.metadata || ['videos', 'audios'].indexOf(this.folder) === -1)
            return Promise.resolve(this.metadata);
        return this.tmpFile()
            .then(multimedia)
            .then((r) => this.update({ metadata: r }))
            // assignamos todos los valores de metadata al propio objeto (duration, fps, etc...)
            .then(() => Object.assign(this, this.metadata));
    }
    tmpFile() {
        return new Promise((ok, ko) => {
            const file = tmpdir + this._id + '_' + this.filename;
            if (fs.existsSync(file))
                return ok(file);
            this.getBucket().openDownloadStream(this.id)
                .pipe(fs.createWriteStream(file))
                .on('error', ko)
                .on('end', () => {
                debug('tmp file created: ' + file);
                ok(file);
            });
        });
    }
    createVideoVersion(k, force) {
        if (!this.processLog[k])
            this.processLog[k] = {};
        if (this.processLog[k].started) {
            const elapsed = Date.now() - this.processLog[k].started.getTime(), max = force ? 4 * 60000 : 4 * 60 * 60000;
            if (elapsed < max) {
                const err = new lipthus_error_1.LipthusError(this.processLog[k].end ?
                    'Could not create version ' + k :
                    'Version ' + k + ' is under process. Started: ' + this.processLog[k].started);
                if (!this.processLog[k].end)
                    err.code = 1;
                return Promise.reject(err);
            }
        }
        this.processLog[k].started = new Date();
        return this.update({ processLog: this.processLog })
            .then(() => this.tmpFile())
            .then((tmpFile) => {
            let cmd = 'ffmpeg -i "' + tmpFile + '" -y -loglevel error -b:v 1M';
            if (this.metadata.width % 2 || this.metadata.height % 2)
                cmd += ' -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2"';
            cmd += ' -c:v ' + (k === 'mp4' ? 'libx264' : 'libvpx');
            if (this.metadata.audioChannels)
                cmd += ' -b:a 64k' + (k === 'webm' ? ' -c:a libvorbis' : ' -strict experimental');
            else
                cmd += ' -an';
            const filename = this.basename(k);
            const newTmpFile = tmpdir + new mongoose_1.Types.ObjectId() + '_' + filename;
            cmd += ' "' + newTmpFile + '"';
            this.processLog[k].command = cmd;
            debug('executing cmd: ' + cmd);
            return this.update({ processLog: this.processLog })
                .then(() => pExec(cmd))
                .then((r) => {
                this.processLog[k].result = r || 'ok';
                this.update({ processLog: this.processLog }).catch(console.error.bind(console));
                if (!fs.existsSync(newTmpFile))
                    throw new Error('tmp file not created: ' + newTmpFile);
                const bulkOptions = { contentType: 'video/' + k };
                return multimedia(newTmpFile)
                    .then((metadata) => bulkOptions.metadata = metadata)
                    .then(() => {
                    return new Promise((ok, ko) => {
                        debug("Version " + k + " created. Inserting it into db...");
                        fs.createReadStream(newTmpFile)
                            .pipe(this.getBucket().openUploadStream(filename, bulkOptions))
                            .on('error', ko)
                            .on('finish', (r2) => {
                            debug('version ' + k + ' written into db: ' + r2._id);
                            return ok(r2._id);
                        });
                    });
                })
                    .then((id) => {
                    if (!this.versions)
                        this.versions = {};
                    this.versions[k] = id;
                    this.processLog[k].end = new Date();
                    const update = {
                        versions: {},
                        processLog: this.processLog
                    };
                    Object.keys(this.versions).forEach(i => {
                        if (this.versions[i])
                            update.versions[i] = this.versions[i]._id || this.versions[i];
                    });
                    return this.update(update)
                        .then(() => {
                        const params = {
                            folder: 'videoversions',
                            parent: this._id
                        };
                        return this.db.fsfiles.updateOne({ _id: id }, { $set: params })
                            .then(() => {
                            this.versions[k] = new GridFSFile(id, this.db);
                            if (videoExt.every(ext => !!this.versions[ext]))
                                this.db.emit('videoProcessed', this);
                        });
                    })
                        .then(() => fsp.unlink(tmpFile))
                        .then(() => fsp.unlink(newTmpFile));
                });
            });
        })
            .then(() => this.versions[k]);
    }
    update(params) {
        return this.db.fsfiles.updateOne({ _id: this._id }, { $set: params }).exec()
            .then(() => Object.assign(this, params))
            .then(() => this);
    }
    /**
     * elimina un archivo
     */
    unlink() {
        if (this.folder !== 'videos')
            return this._unlink();
        return this.load()
            .then(() => Object.keys(this.versions || {}).reduce((p, k) => p.then(() => this.versions[k]._unlink()
            // continue if the version does not exists
            .catch(err => console.error(err))), Promise.resolve()))
            .then(() => this._unlink());
    }
    _unlink() {
        return new Promise((ok, ko) => {
            this.getBucket().delete(this.id, (err) => {
                if (err)
                    ko(err);
                else
                    ok();
            });
        });
    }
    // alias
    remove() {
        return this.unlink();
    }
    basename(ext) {
        let ret = path.basename(this.filename, path.extname(this.filename));
        if (ext)
            ret += '.' + ext;
        return ret;
    }
    sendThumb(req, res, opt) {
        return this.getThumb()
            .then(thumb => {
            if (!thumb)
                return;
            return thumb.send(req, res, opt);
        });
    }
    sendFrame(req, res, position, opt) {
        this.load()
            .then(() => this.getVideoFrame(position))
            .then(bdf => {
            const ref = {
                collection: this.namespace + '.files',
                id: this._id,
                field: 'frame_' + position
            };
            return modules_1.BinDataFile.fromMongo(bdf, ref).send(req, res, opt);
        }, () => res.status(404).send('Not Found'));
    }
    getKey() {
        return this.mTime().getTime().toString();
    }
    getThumb() {
        return this.load()
            .then(() => {
            if (this.thumb) {
                if (!this.thumb.contentType)
                    this.thumb.contentType = 'image/jpeg';
                return this.thumb;
            }
            return this.createThumb();
        });
    }
    createThumb() {
        let ret;
        if (this.contentType.indexOf('video') === 0)
            ret = this.getVideoFrame();
        else if (this.contentType === 'application/pdf')
            ret = this._pdfThumb();
        else
            return Promise.reject(new Error('Can\'t create a thumb of ' + this.filename));
        return ret.then((bdf) => {
            if (bdf) {
                bdf.setColRef({
                    collection: this.namespace + '.files',
                    id: this._id,
                    field: 'thumb'
                });
                return this.update({ thumb: bdf });
            }
        })
            .then(() => this.thumb);
    }
    getVideoFrame(position) {
        return this.getMetadata()
            .then(() => {
            const duration = this.duration;
            if (!position)
                position = duration / 10;
            else if (position > duration)
                throw new Error('Video length is ' + duration + ', lower than ' + position);
            return this.getVideoFrameByNumber(position * this.fps);
        });
    }
    getVideoFrameByNumber(number) {
        const Cache = this.db.cache;
        const opt = {
            name: number + '_' + this.basename('jpg'),
            tag: 'videoframe',
            source: this._id
        };
        return Cache.findOne(opt)
            .then((cached) => {
            if (cached) {
                delete cached.expires;
                delete cached._id;
                delete cached.__v;
                return modules_1.BinDataFile.fromMongo(cached);
            }
            return this.tmpFile()
                .then((tmpFile) => {
                const tmpFile2 = tmpdir + 'frame_' + number + '_' + this._id + '.jpg';
                const cmd = 'ffmpeg -i "' + tmpFile + '" -f image2 -frames:v 1 -ss ' + ((number - 1) / this.fps) + ' ' + tmpFile2;
                debug(cmd);
                return new Promise((ok, ko) => {
                    child_process_1.exec(cmd, err => {
                        if (err)
                            return ko(err);
                        fsp.exists(tmpFile2)
                            .then((exists) => {
                            if (!exists)
                                return ko(new Error('tmp file not created ' + tmpFile2));
                            optimage_1.optimage(tmpFile2)
                                .then((buffer) => {
                                fsp.unlink(tmpFile2).catch(ko);
                                const now = new Date();
                                const bdi = new modules_1.BinDataImage({
                                    name: opt.name,
                                    contentType: 'image/jpeg',
                                    key: now.getTime().toString(),
                                    mtime: now,
                                    uploadDate: now,
                                    size: buffer.length,
                                    md5: md5(buffer),
                                    MongoBinData: new mongoose_1.Types.Buffer(buffer).toObject(),
                                    width: this.metadata.width,
                                    height: this.metadata.height,
                                    tag: 'videoframe',
                                    source: this._id
                                });
                                return Cache.create(bdi).then(() => ok(bdi));
                            })
                                .catch(ko);
                        });
                    });
                });
            });
        });
    }
    _pdfThumb() {
        const tmpFile2 = tmpdir + 'thumb_' + this._id + '.png';
        return this.tmpFile()
            .then(tmpFile => {
            return new Promise((ok, ko) => {
                const cmd = 'convert -thumbnail 150x150 -background white -alpha remove "' + tmpFile + '"[0] ' + tmpFile2;
                child_process_1.exec(cmd, err => {
                    if (err)
                        return ko(err);
                    fsp.exists(tmpFile2)
                        .then((exists) => {
                        if (!exists)
                            return ko(new Error('tmp file not created ' + tmpFile2));
                        modules_1.BinDataFile.fromFile({
                            name: this.basename('png'),
                            path: tmpFile2,
                            contentType: 'image/png',
                            width: 150,
                            height: 150,
                            mtime: this.mTime()
                        })
                            .then(ok)
                            .catch(ko);
                    });
                });
            });
        });
    }
}
exports.GridFSFile = GridFSFile;
class GridFSFileNotFoundError extends Error {
    constructor(msg) {
        super(msg);
        this.status = 404;
    }
}
