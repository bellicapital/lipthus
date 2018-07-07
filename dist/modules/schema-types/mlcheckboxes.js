"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
class MlCheckbox {
    constructor(val, path, options, schema) {
        this.val = val;
        this.path = path;
        this.options = options;
        this.schema = schema;
        this.model = { options: { collection: '' } };
    }
    getVal(req, db) {
        db = db || req.db;
        if (!this.val || !this.val.length)
            return Promise.resolve();
        return this.checkLang(req, db)
            .then(o => {
            const ret = [];
            if (this.val)
                this.val.forEach((val) => ret.push(o[val] ? o[val][req.ml.lang] || o[val][req.ml.defLang] : val));
            return ret;
        });
    }
    checkLang(req, db) {
        const o = this.options.options;
        return new Promise((ok, ko) => {
            if (!req.ml.translateAvailable()) {
                Object.values(o).forEach((v) => {
                    if (!v[req.ml.lang])
                        v[req.ml.lang] = v[req.ml.configLang];
                });
                return ok(o);
            }
            const toTranslate = [];
            const toTranslateKeys = [];
            Object.each(o, (k, v) => {
                if (!v[req.ml.lang]) {
                    toTranslate.push(v[req.ml.configLang]);
                    toTranslateKeys.push(k);
                }
            });
            if (!toTranslate.length)
                return ok(o);
            if (!req.ml.translateAvailable())
                return ok();
            req.ml.translate(toTranslate, (err, result) => {
                if (err)
                    return ko(err);
                result.forEach((r, idx) => o[toTranslateKeys[idx]][req.ml.lang] = r);
                const query = { colname: this.model.options.collection.replace('dynobjects.', '') };
                const update = {};
                update['dynvars.' + this.path + '.options'] = o;
                db.dynobject.update(query, update)
                    .then(() => ok(o))
                    .catch(ko);
            });
        });
    }
    toString() {
        return this.val;
    }
    toObject() {
        const ret = {};
        if (!this.val)
            return ret;
        this.val.forEach((val) => ret[val] = this.options.options[val]);
        return ret;
    }
}
exports.MlCheckbox = MlCheckbox;
class MlCheckboxes extends mongoose_1.SchemaType {
    /**
     *
     * @param {String} path
     * @param {Object} [options]
     */
    constructor(path, options) {
        super(path, options, 'MlCheckboxesType');
        this.path = path;
        this.options = options;
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
    // default(val) {
    // 	return new MlCheckboxes(val);
    // }
    //noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
    /**
     * Implement checkRequired method.
     *
     * @param {*} val
     * @return {Boolean}
     */
    checkRequired(val) {
        return !!(val && val.length);
    }
    /**
     * Implement casting.
     *
     * @param {*} val
     * @param {Object} [scope]
     * @param init
     * @return {any}
     */
    cast(val, scope, init) {
        if (val instanceof MlCheckbox)
            return val;
        if (null === val || !Array.isArray(val))
            return null;
        if (!init)
            return val;
        return new MlCheckbox(val, this.path, this.options, scope && scope.constructor.name === 'model' && scope.schema);
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
                throw new Error("Can't use " + $conditional + " with MlCheckboxes.");
            return handler.call(this, value);
        }
        else {
            if ('string' === typeof $conditional)
                return $conditional;
            else if ($conditional instanceof MlCheckboxes)
                return $conditional.val;
        }
    }
}
exports.MlCheckboxes = MlCheckboxes;
/*!
 * ignore
 */
const handleSingle = function (val) {
    return this.cast(val);
};
const handleExists = () => true;
const handleArray = function (val) {
    return val.map(m => typeof m === 'string' ? m : this.cast(m));
};
/**
 * Expose
 */
mongoose_1.Schema.Types.MlCheckboxes = MlCheckboxes;
exports.MlCheckboxesType = MlCheckboxes;
