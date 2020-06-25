"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FsType = exports.Fs = exports.FsList = void 0;
const mongoose = require("mongoose");
const mongoose_1 = require("mongoose");
const lib_1 = require("../../lib");
const bdf_1 = require("../bdf");
class FsList {
    constructor(val, type, collection, itemId, path, dbname) {
        Object.each(val, (i, v) => {
            if (v.constructor.name === 'ObjectID') {
                this[i] = new lib_1.GridFSFile(v, mongoose.dbs[dbname]);
                if (type === 'video')
                    this[i].folder = 'videos';
            }
            else if (v.MongoBinData) {
                this[i] = bdf_1.BinDataFile.fromMongo(v, {
                    collection: collection,
                    id: itemId,
                    field: path + '.' + i
                });
            }
            else {
                throw new Error('No file found in ' + i);
            }
        });
    }
    keys() {
        return Object.keys(this);
    }
    /**
     * Get the first element
     * @returns {GridFSFile}
     */
    getFirst() {
        const keys = this.keys();
        return keys[0] && this[keys[0]];
    }
    size() {
        return this.keys().length;
    }
    getThumb(width, height, crop) {
        const first = this.getFirst();
        if (!first)
            return;
        if (!width)
            width = 100;
        if (!height)
            height = 100;
        crop = crop === undefined || crop ? 1 : 0;
        return {
            width: width,
            height: height,
            contentType: 'image/jpeg',
            uri: '/videos/' + first._id + '/poster' + width + 'x' + height + 'k' + crop + '.jpg'
        };
    }
    //noinspection JSUnusedGlobalSymbols
    toJSON() {
        const ret = {};
        Object.keys(this).forEach(k => ret[k] = this[k]._id);
        return ret;
    }
    info() {
        const ret = [];
        this.keys().forEach(k => {
            const info = this[k].info.apply(this[k], arguments);
            // Ensure key
            info.key = k;
            ret.push(info);
        });
        return ret;
    }
    loadFiles() {
        const files = [];
        const keys = this.keys();
        if (!keys.length)
            return Promise.resolve(files);
        const promises = keys.map(k => {
            if (this[k] instanceof bdf_1.BinDataFile) {
                files.push(this[k]);
            }
            else {
                return this[k].load()
                    .then((gfsf) => {
                    if (gfsf)
                        files.push(gfsf);
                    else
                        // file missing. tmp solution
                        delete this[k];
                });
            }
        });
        return Promise.all(promises);
    }
    /**
     * File value to include in form fields
     * @returns {String}
     */
    formDataValue() {
        const videoval = [];
        this.keys().forEach(k => {
            const obj = {
                id: this[k]._id
            };
            if (this[k].thumb)
                obj.thumbMD5 = this[k].thumb.md5;
            videoval.push(k + ':' + JSON.stringify(obj));
        });
        return videoval.join('|');
    }
}
exports.FsList = FsList;
class Fs extends mongoose_1.SchemaType {
    constructor(path, options) {
        super(path, options);
        this.path = path;
        this.options = options;
    }
    //noinspection JSUnusedLocalSymbols
    /**
     * Implement casting.
     *
     * @param {*} val
     * @param {Object} [scope]
     * @param {Boolean} [init]
     * @return {any}
     */
    cast(val, scope, init) {
        if (null === val)
            return val;
        if ('object' !== typeof val)
            return null;
        // Para cuando se hace un update se valida sólo con el valor!!!!
        if (val.constructor.name === 'ObjectID')
            return val;
        if (val.MongoBinData)
            return bdf_1.BinDataFile.fromMongo(val);
        if (val instanceof FsList)
            return val;
        let ret;
        try {
            ret = new FsList(val, this.options.origType, this.collection, this.id, this.path, this.dbname);
        }
        catch (e) {
            throw new mongoose_1.SchemaType.CastError('Fs', Object.keys(val), this.path);
        }
        return ret;
    }
    // noinspection JSMethodCanBeStatic
    get $conditionalHandlers() {
        return {
            '$lt': handleSingle,
            '$lte': handleSingle,
            '$gt': handleSingle,
            '$gte': handleSingle,
            '$ne': handleSingle,
            '$in': handleArray,
            '$nin': handleArray,
            '$mod': handleArray,
            '$all': handleArray,
            '$exists': handleExists
        };
    }
    // noinspection JSUnusedGlobalSymbols
    castForQuery($conditional, value) {
        if (2 === arguments.length) {
            const handler = this.$conditionalHandlers[$conditional];
            if (!handler)
                throw new Error("Can't use " + $conditional + " with Fs Type.");
            return handler.call(this, value);
        }
        else
            return this.cast($conditional);
    }
}
exports.Fs = Fs;
exports.FsType = Fs;
const handleSingle = function (val) {
    return this.cast(val);
};
const handleExists = () => true;
const handleArray = function (val) {
    return val.map(m => this.cast(m));
};
/**
 * Expose
 */
mongoose_1.Schema.Types.Fs = Fs;
mongoose_1.Types.Fs = mongoose_1.mongo.FsType;
