"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultilangType = exports.MultilangText = exports.Multilang = void 0;
const mongoose_1 = require("mongoose");
const debug0 = require("debug");
const debug = debug0('site:mltext');
const defaultLang = require('../multilang').Multilang.defaultLang;
class Multilang extends mongoose_1.SchemaType {
    /**
     * @param {String} path
     * @param {Object} [options]
     */
    constructor(path, options) {
        super(path, options, path ? 'Multilang' : 'MultilangArray');
        this.path = path;
        this.options = options;
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
    //noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
    checkRequired(val) {
        return null !== val;
    }
    //noinspection JSMethodCanBeStatic
    cast(val, scope, init) {
        if (null === val)
            return null;
        // si hay scope, tiene que ser un objeto porque pertenece a un ducumento
        // si no, puede ser un subdocumento y lo devolvemos tal cual
        if ('object' !== typeof val)
            return scope ? null : val;
        if (!init || val instanceof MultilangText)
            return val;
        return new MultilangText(val, scope.collection, this.path, scope._id, scope.db.lipthusDb);
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
            if (!handler) {
                throw new Error("Can't use " + $conditional + " with Multilang.");
            }
            return handler.call(this, value);
        }
        else {
            return this.cast($conditional);
        }
    }
    static get MultilangText() {
        return MultilangText;
    }
}
exports.Multilang = Multilang;
exports.MultilangType = Multilang;
/*!
 * ignore
 */
const handleSingle = function (val) {
    return this.cast(val);
};
const handleExists = () => true;
const handleArray = function (val) {
    return val.map(m => this.cast(m));
};
class MultilangText {
    constructor(obj, collection, path, _id, db) {
        this.obj = obj;
        this.collection = collection;
        this.path = path;
        this._id = _id;
        this.site = db.site;
        if (obj) {
            if (obj.undefined) { // tmp solution. jj - No sé porqué, pero aparecen
                debug('lang code not valid: {undefined: ' + obj.undefined + '}');
                delete obj.undefined;
            }
        }
        Object.defineProperties(this, {
            model: { get: () => db[collection.name] }
        });
    }
    toJSON() {
        return this.obj;
    }
    getLang(lang, alt) {
        return this.obj[lang] || (alt && this.obj[alt]) || this.obj[defaultLang] || '';
    }
    // setLang(lang: string, value: string) {
    // 	this.obj[lang] = value;
    // }
    /**
     *
     * @param {string} lang
     * @returns {Promise}
     */
    getLangOrTranslate(lang) {
        return new Promise((ok, ko) => {
            if (!lang)
                return ko(new Error('no lang provided'));
            if (this.obj[lang]) {
                // jj - 24/11/16
                // solución temporal a un error pasado en las traducciones
                // eliminar en unos meses
                if (this.obj[lang].constructor.name === 'Array' && this.obj[lang][0].translatedText)
                    this.updateLang(lang, this.obj[lang][0].translatedText);
                // end tmp solution
                return ok(this.obj[lang]);
            }
            const from = this.site.config.language;
            const src = this.obj[from];
            if (!src || !this.site.translator)
                return ok();
            this.site.translate(src, from, lang, (err, data) => {
                ok(data || src);
                if (err)
                    console.error(err.error || (err.response && err.response.body) || err);
                if (!data)
                    return;
                this.updateLang(lang, data);
            }, 'MultilangText.getLangOrTranslate: ' + this.collection.name + '.' + this.path);
        });
    }
    updateLang(lang, data) {
        this.obj[lang] = data;
        if (!this._id)
            console.error(new Error('MultilangText no updated. No _id provided. Data: ' + data));
        const update = {};
        update[this.path + '.' + lang] = data;
        this.collection.updateOne({ _id: this._id }, { $set: update })
            .then((r) => {
            if (!r.result.nModified)
                console.error(new Error('MultilangText no updated. Id: ' + this._id + JSON.stringify(update)));
        })
            .catch((err) => console.error(err));
    }
    toString() {
        return this.obj[defaultLang] || '';
    }
}
exports.MultilangText = MultilangText;
/**
 * Expose
 */
mongoose_1.Schema.Types.Multilang = Multilang;
mongoose_1.Types.Multilang = Multilang;
