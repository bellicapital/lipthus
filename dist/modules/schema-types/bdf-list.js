"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bdf_1 = require("../bdf");
const mongoose_1 = require("mongoose");
class BinDataFileList {
    /**
     * First element
     * @returns {BinDataFile}
     */
    getFirst() {
        const keys = Object.keys(this);
        if (!keys.length)
            return;
        return Object.keys(this).map(key => this[key]).filter((im) => !im.hidden).sort((a, b) => a.weight - b.weight)[0];
    }
    getThumb(width, height, crop, enlarge) {
        const first = this.getFirst();
        return first ? first.info(width, height, crop === undefined ? true : crop, enlarge) : null;
    }
    info(width, height, crop, enlarge) {
        return Object.keys(this).map(key => this[key].info(width, height, crop, enlarge)).sort((a, b) => a.weight - b.weight);
    }
    toObject() {
        const ret = [];
        const keys = Object.keys(this);
        keys.forEach(key => ret.push(this[key]));
        return ret;
    }
    // noinspection JSUnusedGlobalSymbols
    formDataValue() {
        const arr = [];
        Object.keys(this).forEach(key => arr.push(key + ':' + this[key].name || this[key]));
        return arr.join('|');
    }
    size() {
        return Object.keys(this).length;
    }
}
exports.BinDataFileList = BinDataFileList;
class BdfList extends mongoose_1.SchemaType {
    constructor(key, options) {
        super(key, options);
    }
    //noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
    checkRequired(val) {
        return null !== val;
    }
    // noinspection JSUnusedLocalSymbols
    /**
     * Implement casting.
     *
     * @param {*} val
     * @param {Object} [scope]
     * @param {Boolean} [init]
     * @return {*}
     */
    cast(val, scope, init) {
        if (null === val)
            return val;
        if ('object' !== typeof val)
            return null;
        if (val instanceof bdf_1.BinDataFile)
            return val; // Necesario para cuando se hace un update individual
        // if (!init)
        // 	return val;
        const retTmp = {};
        const ret = new BinDataFileList;
        const w = [];
        Object.keys(val).forEach(i => {
            if (val[i].MongoBinData) {
                w.push(i);
                if (val[i] instanceof bdf_1.BinDataFile)
                    retTmp[i] = val[i];
                else
                    retTmp[i] = bdf_1.BinDataFile.fromMongo(val[i], {
                        db: this.dbname,
                        collection: this.collection,
                        id: this.id,
                        field: this.path + '.' + i
                    });
                retTmp[i].key = i;
            }
        });
        // Sort by weight
        w.sort((a, b) => retTmp[a].weight - retTmp[b].weight);
        w.forEach(k => ret[k] = retTmp[k]);
        return ret;
    }
    //noinspection JSMethodCanBeStatic
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
    /**
     * Implement query casting, for mongoose 3.0
     *
     * @param {String} $conditional
     * @param {*} [value]
     */
    castForQuery($conditional, value) {
        if (2 === arguments.length) {
            const handler = this.$conditionalHandlers[$conditional];
            if (!handler)
                throw new Error("Can't use " + $conditional + " with BdfList Type.");
            return handler.call(this, value);
        }
        else
            return this.cast($conditional);
    }
}
exports.BdfList = BdfList;
BdfList.BinDataFileList = BinDataFileList;
const handleSingle = function (val) {
    return this.cast(val);
};
const handleExists = (r) => r;
const handleArray = function (val) {
    return val.map((m) => this.cast(m));
};
/**
 * Expose
 */
mongoose_1.Schema.Types.BdfList = BdfList;
