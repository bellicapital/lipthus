"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const path = require("path");
const fs = require('fs');
const Mime = require('mime');
const md5 = require('md5');
const Binary = require('mongoose').Types.Buffer.Binary;
const request = require('request');
class BinDataFile {
    constructor(data, colRef) {
        this.name = data.name;
        this.uploadDate = ensureDate(data.uploadDate);
        this.mtime = ensureDate(data.mtime);
        this.contentType = data.contentType;
        this.size = data.size;
        this.MongoBinData = data.MongoBinData;
        this.key = data.key;
        this.md5 = data.md5;
        this.weight = data.weight || 0;
        if (colRef)
            this.setColRef(colRef);
    }
    setColRef(colRef) {
        if (colRef)
            Object.defineProperty(this, 'colRef', { value: colRef });
    }
    info() {
        const ret = new DbfInfo({
            name: this.name,
            contentType: this.contentType,
            uploadDate: this.uploadDate,
            path: this.getPath(),
            weight: this.weight,
            mtime: this.mtime,
            size: this.size,
            key: this.getKey()
        });
        ret.uri = ret.path + this.uriName();
        return ret;
    }
    //noinspection JSUnusedGlobalSymbols
    toJSON() {
        return this.info();
    }
    getPath() {
        if (!this.colRef)
            return;
        let ret = '/bdf/';
        if (this.colRef.db)
            ret += this.colRef.db + '.';
        ret += this.colRef.collection + '/' + this.colRef.id + '/' + this.colRef.field + '/';
        return ret;
    }
    getUri() {
        return this.colRef ? this.getPath() + this.uriName() : null;
    }
    uriName(ext) {
        const curExt = path.extname(this.name);
        const bn = path.basename(this.name, curExt);
        return encodeURIComponent(bn.replace(/[\s()]*/g, '')) + (ext || curExt);
    }
    // noinspection JSUnusedGlobalSymbols
    formDataValue() {
        return this.name;
    }
    send(req, res) {
        if (!this.MongoBinData)
            return Promise.reject(new Error('MongoBinData is empty'));
        const data = Buffer.from(this.MongoBinData.buffer);
        if (this.contentType)
            res.type(this.contentType);
        res.set('Expires', new Date().addDays(60).toUTCString());
        if (this.mtime)
            res.set('Last-modified', this.mtime.toUTCString());
        return res.send(data);
    }
    getKey() {
        if (!this.key)
            this.key = this.uploadDate.getTime().toString();
        return this.key;
    }
    toString() {
        return 'data:' + this.contentType + ';base64,' + this.MongoBinData.toString('base64');
    }
    static fromMongo(mongo, colRef) {
        if (!mongo)
            return mongo;
        if (mongo.toObject)
            mongo = mongo.toObject();
        return /^image\/.*$/.test(mongo.contentType)
            ? new bdi_1.BinDataImage(mongo, colRef)
            : new BinDataFile(mongo, colRef);
    }
    static fromString(str, colRef, datetime = new Date()) {
        const r = /data:(\w+\/\w+);([^,]+)(.+)$/.exec(str);
        if (!r)
            return;
        const ext = r[1].split('/')[1];
        const buffer = Buffer.from(r[3], r[2]);
        const obj = {
            contentType: r[1],
            size: buffer.length,
            md5: md5(buffer),
            uploadDate: datetime,
            mtime: datetime,
            name: 'str-' + datetime.getTime() + '.' + ext,
            MongoBinData: new Binary(buffer)
        };
        let ret;
        if (/^image\/.*$/.test(obj.contentType)) {
            ret = new bdi_1.BinDataImage(obj, colRef);
            ret.getDimensions();
        }
        else
            ret = new BinDataFile(obj, colRef);
        return ret;
    }
    /**
     *
     * @param param
     * @param opt
     *
     * @return Promise<BinDataFile>
     */
    static fromFile(param, opt = {}) {
        const p = typeof param === 'string' ? { path: param } : param;
        if (!p.mimetype)
            p.mimetype = p.type || Mime.getType(p.name || p.path);
        return util_1.promisify(fs.readFile)(p.path)
            .then((buffer) => {
            p.buffer = buffer;
            if (p.mtime)
                return;
            // incrusta mtime si no se ha aportado desde el cliente
            return util_1.promisify(fs.stat)(p.path)
                .then((stats) => p.mtime = stats.mtime);
        })
            .then(() => BinDataFile.fromBuffer({
            originalname: p.name || p.originalname || path.basename(p.path),
            mimetype: p.mimetype,
            mtime: p.mtime,
            buffer: p.buffer
        }, opt));
    }
    // noinspection JSUnusedGlobalSymbols
    static fromUrl(url) {
        return new Promise((ok, ko) => {
            request({ url: url, encoding: null }, (err, res, body) => {
                if (err)
                    return ko(err);
                ok(BinDataFile.fromBuffer({
                    originalname: path.basename(url),
                    mimetype: res.headers['content-type'],
                    mtime: new Date(),
                    buffer: body
                }));
            });
        });
    }
    static fromBuffer(p, opt) {
        const obj = {
            name: p.name || p.originalname,
            contentType: p.contentType || p.mimetype,
            mtime: p.mtime || new Date(),
            uploadDate: new Date(),
            size: p.size || p.buffer.length,
            md5: md5(p.buffer),
            MongoBinData: new Binary(p.buffer)
        };
        return /^image\/.*$/.test(p.mimetype) ? new bdi_1.BinDataImage(obj).postFromFile(opt) : Promise.resolve(new BinDataFile(obj));
    }
    //noinspection JSUnusedGlobalSymbols
    /**
     * Use Bdf.fromString
     *
     * @deprecated
     * @param img
     * @param width
     * @param height
     * @param colRef
     * @param datetime
     * @returns {*}
     */
    static fromData(img, width, height, colRef, datetime = new Date()) {
        console.warn('@deprecated', 'Bdf.fromData');
        if (!/^data:(image\/\w+);base64,/.test(img))
            return new Error('wrong data');
        const isImageResult = /^data:(image\/\w+);base64,/.exec(img);
        const contentType = isImageResult && isImageResult[1];
        const data = img.replace(/^data:image\/\w+;base64,/, "");
        return new bdi_1.BinDataImage({
            name: "fromData_" + Date.now() + ".png",
            contentType: contentType,
            mtime: datetime,
            uploadDate: datetime,
            size: data.length,
            md5: md5(data),
            width: width,
            height: height,
            MongoBinData: new Binary(Buffer.from(data, 'base64'))
        }, colRef);
    }
    //noinspection JSUnusedGlobalSymbols
    static isBdf(o) {
        return !!o.MongoBinData;
    }
}
exports.BinDataFile = BinDataFile;
class DbfInfo {
    constructor(p) {
        this.path = p.path;
        this.name = p.name;
        this.md5 = p.md5;
        this.contentType = p.contentType;
        this.uploadDate = p.uploadDate;
        this.weight = p.weight;
        this.mtime = p.mtime;
        this.size = p.size;
        this.key = p.key;
    }
}
exports.DbfInfo = DbfInfo;
const bdi_1 = require("./bdi");
exports.default = BinDataFile;
function ensureDate(date) {
    if (date instanceof Date)
        return date;
    if (!date)
        return new Date();
    return new Date(date);
}
