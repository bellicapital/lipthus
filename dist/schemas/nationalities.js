"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NationalitiesStatics = exports.NationalitiesMethods = exports.getSchema = exports.name = void 0;
const lib_1 = require("../lib");
exports.name = 'nationalities';
// noinspection JSUnusedGlobalSymbols
function getSchema() {
    const s = new lib_1.LipthusSchema({
        code: String,
        title: lib_1.LipthusSchemaTypes.Multilang
    }, {
        collection: 'nationalities'
    });
    const methods = NationalitiesMethods.prototype;
    Object.getOwnPropertyNames(methods).filter(pn => pn !== 'constructor').forEach(k => s.methods[k] = methods[k]);
    const statics = NationalitiesStatics.prototype;
    Object.getOwnPropertyNames(statics).filter(pn => pn !== 'constructor').forEach(k => s.statics[k] = statics[k]);
    return s;
}
exports.getSchema = getSchema;
class NationalitiesMethods {
}
exports.NationalitiesMethods = NationalitiesMethods;
class NationalitiesStatics {
    getList(req, lang) {
        const _lang = lang || req.ml.lang;
        return this.getLangList(_lang);
    }
    getLangList(lang) {
        const sort = {};
        const list = {};
        sort['title.' + lang] = 1;
        // noinspection TypeScriptValidateJSTypes
        return this.find()
            .collation({ locale: lang })
            .sort(sort)
            .then((r) => r.map(t => t.title && t.title
            .getLangOrTranslate(lang)
            .then((name2) => list[t.code] = name2)))
            .then((p) => Promise.all(p))
            .then(() => list);
    }
    // noinspection JSUnusedGlobalSymbols
    setVal(code, lang, value) {
        const update = { $set: {} };
        update.$set["title." + lang] = value;
        return this.updateOne({ code: code }, update, { upsert: true })
            .then((r) => !(!r.result || !(r.result.nModified || r.result.upserted)));
    }
}
exports.NationalitiesStatics = NationalitiesStatics;
