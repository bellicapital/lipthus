"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
let cache = {};
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
        const end = () => {
            if (lang === req.ml.lang && !req.nationalities)
                Object.defineProperty(req, 'nationalities', { value: cache[_lang] });
            return cache[_lang];
        };
        if (cache[_lang])
            return Promise.resolve(end());
        return this.getLangList(_lang)
            .then((list) => {
            cache[_lang] = list;
            return end();
        });
    }
    getLangList(lang) {
        const sort = {};
        const list = {};
        sort['title.' + lang] = 1;
        return this.find()
            .sort(sort)
            .then((r) => r.map(t => t.title
            .getLangOrTranslate(lang)
            .then((name2) => list[t.code] = name2)))
            .then((p) => Promise.all(p))
            .then(() => list);
    }
    setVal(code, lang, value) {
        const update = { $set: {} };
        update.$set["title." + lang] = value;
        return this.updateNative({ code: code }, update, { upsert: true })
            .then((r) => {
            if (!r.result || !(r.result.nModified || r.result.upserted))
                return false;
            cache = {};
            return true;
        });
    }
}
exports.NationalitiesStatics = NationalitiesStatics;
