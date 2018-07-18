"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Image = require('./image');
const gm = require('gm').subClass({ imageMagick: true }); // jj 23-9-15 con imageMagick es más estable
const bdf_1 = require("./bdf");
const util_1 = require("util");
const path = require('path');
const md5 = require('md5');
const Binary = require('mongoose').Types.Buffer.Binary;
const debug = require('debug')('site:bdi');
class BinDataImage extends bdf_1.BinDataFile {
    constructor(data, colRef) {
        super(data, colRef);
        this.width = data.width;
        this.height = data.height;
        this.alt = data.alt || {};
        this.title = data.title || {};
    }
    info(width, height, crop, enlarge, nwm) {
        const ret = new DbfImageInfo({
            name: this.name,
            contentType: this.contentType,
            naturalWidth: this.width,
            naturalHeight: this.height,
            width: this.width,
            height: this.height,
            path: this.getPath(),
            weight: this.weight,
            size: this.size,
            mtime: this.mtime,
            alt: this.alt,
            title: this.title,
            md5: this.md5,
            key: this.getKey()
        });
        ret.uri = ret.path;
        // los svg no se redimensionan
        if (this.contentType.indexOf('svg') === -1) {
            if (width) {
                if (!height) { //noinspection JSSuspiciousNameCombination
                    height = width;
                }
                if (enlarge) {
                    ret.width = width;
                    ret.height = height;
                }
                else
                    Object.assign(ret, Image.fitCalc(this.width, this.height, width, height, crop));
            }
            ret.uri += ret.width + 'x' + ret.height;
            if (crop)
                ret.uri += 'k1';
            if (nwm)
                ret.uri += 'm' + this.md5;
            ret.uri += '/';
        }
        ret.uri += this.uriName();
        return ret;
    }
    toJSON() {
        const ret = super.info();
        ret.width = this.width;
        ret.height = this.height;
        if (this.alt)
            ret.alt = this.alt;
        if (this.title)
            ret.title = this.title;
        return ret;
    }
    getDimentions() {
        if (!this.width) {
            if (this.contentType === 'image/png') {
                this.width = this.MongoBinData.buffer.readUInt32BE(16);
                this.height = this.MongoBinData.buffer.readUInt32BE(20);
            }
        }
        return {
            width: this.width,
            height: this.height
        };
    }
    getThumb(width, height, crop, enlarge) {
        return this.info().getThumb(width, height, crop, enlarge);
    }
    getCached(db, opt) {
        const Cache = db.cache;
        if (this.md5)
            opt.srcmd5 = this.md5;
        if (!opt['ref.id'] && this.colRef)
            Object.keys(this.colRef).forEach(i => opt['ref.' + i] = this.colRef[i]);
        const cacheOpt = {};
        Object.assign(cacheOpt, opt);
        cacheOpt.contentType = 'image/' + (opt.format || 'jpg');
        delete cacheOpt.format;
        if (cacheOpt.wm)
            cacheOpt.wm = true;
        if (!cacheOpt.width)
            cacheOpt.width = { $exists: false };
        return Cache
            .findOne(cacheOpt)
            .then((cached) => {
            if (cached)
                return bdf_1.BinDataFile.fromMongo(cached);
            return this.toBuffer(opt)
                .then((buffer) => {
                const cache = Object.assign({
                    name: this.name,
                    contentType: cacheOpt.contentType,
                    mtime: this.mtime || new Date(),
                    tag: 'image',
                    MongoBinData: new Binary(buffer),
                    ref: this.colRef,
                    srcmd5: this.md5
                }, opt);
                return new Cache(cache);
            })
                .then((cached2) => cached2.save())
                .then((cached3) => bdf_1.BinDataFile.fromMongo(cached3));
        });
    }
    toBuffer(opt) {
        let gmi = gm(this.MongoBinData.buffer, this.contentType.replace('/', '.'))
            .quality(70)
            .strip()
            .autoOrient();
        if (opt.width) {
            gmi.coalesce().resize(opt.width, opt.height, opt.crop && '^');
            if (opt.crop)
                gmi.gravity('Center').crop(opt.width, opt.height);
        }
        if (opt.format)
            gmi.setFormat(opt.format);
        return util_1.promisify(gmi.toBuffer.bind(gmi))()
            .then((buffer) => {
            if (!buffer || !opt.wm)
                return buffer;
            if (opt.wm.type === 2) {
                gmi = gm(buffer, this.name)
                    .command('composite')
                    .gravity(opt.wm.gravity || 'Center')
                    .strip()
                    .in(opt.wm.image);
                if (opt.wm.geometry)
                    gmi.geometry(opt.wm.geometry);
                return util_1.promisify(gmi.toBuffer.bind(gmi))();
            }
            return buffer;
        });
    }
    send(req, res, opt) {
        if (!opt)
            return super.send(req, res);
        else
            return this.getCached(req.site.db, opt)
                .then((cached) => cached.send(req, res))
                .catch(req.next);
    }
    postFromFile(opt = {}) {
        const gmi = gm(this.MongoBinData.buffer)
            .strip();
        return util_1.promisify(gmi.identify.bind(gmi))()
            .then((ft) => {
            this.width = ft.size.width;
            this.height = ft.size.height;
            if (opt.noResize || this.contentType.match(/(gif|svg)/i))
                return;
            gmi.autoOrient();
            if (this.width > opt.maxwidth || this.height > opt.maxheight) {
                const s = Math.min(opt.maxwidth / this.width, opt.maxheight / this.height);
                this.width = Math.round(s * this.width);
                this.height = Math.round(s * this.height);
                debug('resize image. Max width: ' + opt.maxwidth + '. Max height: ' + opt.maxheight + '. New width: ' + this.width + '. New height: ' + this.height);
                gmi.resize(this.width, this.height);
            }
            return util_1.promisify(gmi.toBuffer.bind(gmi))()
                .then((buffer) => {
                this.MongoBinData = new Binary(buffer);
                this.size = buffer.length;
            });
        })
            .then(() => this)
            .catch((err) => {
            if (err.code === 'ENOENT')
                err.message += '\nis graphicsmagick installed?\nhttps://github.com/aheckmann/gm';
            throw err;
        });
    }
    static fromFile(p, opt = {}) {
        return bdf_1.BinDataFile.fromFile(p, opt)
            .then((bdi) => bdi.postFromFile());
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     *
     * @param params {{
     *      data: string (raw image data),
     *      name: string,
     *      [lastModified]: Date,
     *      [size]: number,
     *      [contentType]: string
     *      weight?: number
     * }}
     * @param colRef
     * @returns {Promise.<BinDataImage>}
     */
    static fromFrontEnd(params, colRef) {
        const r = /data:(\w+\/\w+);([^,]+)(.+)$/.exec(params.data);
        if (!r)
            return Promise.reject(new Error('No valid data'));
        const ext = r[1].split('/')[1];
        const buffer = Buffer.from(r[3], r[2]);
        const date = params.lastModified || new Date();
        const obj = {
            contentType: r[1],
            size: buffer.length,
            md5: md5(buffer),
            uploadDate: new Date(),
            mtime: date,
            name: params.name || 'str-' + date.getTime() + '.' + ext,
            MongoBinData: new Binary(buffer),
            weight: params.weight
        };
        if (params.size && params.size !== obj.size)
            debug('params.size "' + params.size + '" do not match width data "' + obj.size + '"');
        if (params.contentType && params.contentType !== obj.contentType)
            debug('params.contentType "' + params.contentType + '" do not match width data "' + obj.contentType + '"');
        return new BinDataImage(obj, colRef).postFromFile();
    }
}
exports.BinDataImage = BinDataImage;
class DbfImageInfo extends bdf_1.DbfInfo {
    constructor(p) {
        super(p);
        this.width = p.width;
        this.height = p.height;
        this.naturalWidth = p.naturalWidth;
        this.naturalHeight = p.naturalHeight;
        this.alt = p.alt || {};
        this.title = p.title || {};
    }
    getThumb(width, height, crop, nwm = false, enlarge = false, ext = '.jpg') {
        const ret = new DbfThumb({
            uri: this.path,
            name: this.uriName(ext),
            width: this.width,
            height: this.height,
            alt: this.alt,
            title: this.title,
            originalWidth: this.width,
            originalHeight: this.height
        });
        if (width) {
            if (!crop) {
                const fc = Image.fitCalc(this.width, this.height, width, height, crop);
                ret.width = fc.width;
                ret.height = fc.height;
            }
            else {
                ret.width = width;
                ret.height = height;
            }
            ret.uri += ret.width + 'x' + ret.height;
            if (crop)
                ret.uri += 'k1';
            ret.uri += '/';
        }
        if (nwm)
            ret.uri += 'm' + this.md5;
        ret.uri += ret.name;
        ret.originalUri = this.path + ret.name;
        return ret;
    }
    uriName(ext) {
        const curext = path.extname(this.name);
        const bn = path.basename(this.name, curext);
        return encodeURIComponent(bn.replace(/\s/g, '')) + (ext || curext);
    }
}
exports.DbfImageInfo = DbfImageInfo;
class DbfThumb {
    constructor(values) {
        this.uri = values.uri;
        this.name = values.name;
        this.width = values.width;
        this.height = values.height;
        this.originalWidth = values.originalWidth;
        this.originalHeight = values.originalHeight;
        this.alt = values.alt;
        this.title = values.title;
    }
    toHtml() {
        return '<a href="' + this.originalUri + '"><img src="' + this.uri + '" alt="' + this.name + '"/></a>';
    }
}
exports.DbfThumb = DbfThumb;
exports.default = BinDataImage;
