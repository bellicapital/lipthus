"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const bdf_1 = require("../bdf");
class Bdf extends mongoose_1.SchemaType {
    constructor(path, options) {
        super(path, options);
        this.path = path;
        this.options = options;
    }
    //noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
    checkRequired(val) {
        return null !== val;
    }
    // noinspection JSUnusedLocalSymbols
    cast(val, scope, init) {
        if (null === val)
            return val;
        if ('object' !== typeof val)
            return null;
        if (val instanceof bdf_1.BinDataFile)
            return val;
        if (val.MongoBinData) {
            return bdf_1.BinDataFile.fromMongo(val, {
                db: this.dbname,
                collection: this.collection,
                id: this.id,
                field: this.path
            });
        }
        throw new mongoose_1.SchemaType.CastError('Bdf', val, 'path?');
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
                throw new Error("Can't use " + $conditional + " with Bdf Type.");
            return handler.call(this, value);
        }
        else {
            return this.cast($conditional);
        }
    }
}
exports.Bdf = Bdf;
exports.BdfType = Bdf;
const handleSingle = function (val) {
    return this.cast(val);
};
const handleExists = () => true;
const handleArray = function (val) {
    return val.map(m => this.cast(m));
};
mongoose_1.Schema.Types.Bdf = Bdf;
