"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const util_1 = require("util");
const exec = util_1.promisify(require('child_process').exec);
const exclude = {
    _id: false,
    _mod: false,
    _tag: false,
    __v: false,
    modified: false,
    created: false
};
const excludeAll = [
    '_id',
    '_mod',
    '_k',
    '_tag',
    '__v',
    'modified',
    'created'
];
exports.name = 'lang';
function getSchema() {
    const s = new lib_1.LipthusSchema({
        _tag: { type: String, index: true },
        _k: { type: String, index: true, unique: true }
    }, {
        collection: 'lang',
        strict: false,
        id: false
    });
    const methods = LipthusLanguageMethods.prototype;
    Object.getOwnPropertyNames(methods).filter(pn => pn !== 'constructor').forEach(k => s.methods[k] = methods[k]);
    const statics = LipthusLanguageStatics.prototype;
    Object.getOwnPropertyNames(statics).filter(pn => pn !== 'constructor').forEach(k => s.statics[k] = statics[k]);
    return s;
}
exports.getSchema = getSchema;
class LipthusLanguageMethods {
    values() {
        const ret = this.toObject();
        excludeAll.forEach(n => delete (ret[n]));
        return ret;
    }
}
exports.LipthusLanguageMethods = LipthusLanguageMethods;
class LipthusLanguageStatics {
    get(n) {
        return this.findOne({ _k: n });
    }
    getValues(n) {
        return this.get(n)
            .then((r) => r && r.values());
    }
    load(tag, code) {
        const fields = { _id: false, _k: true };
        fields[code] = true;
        return this.find({ _tag: tag }, fields);
    }
    getMlTag(tag) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof tag === 'string')
                return this.getMlTag_(tag);
            const ret = {};
            for (const t of tag) {
                const r = yield this.getMlTag_(t);
                Object.assign(ret, r);
            }
            return ret;
        });
    }
    getMlTag_(tag) {
        return __awaiter(this, void 0, void 0, function* () {
            const r = yield this.find({ _tag: tag }, exclude);
            const ret = {};
            for (const obj of r) {
                ret[obj._k] = obj.toObject();
                delete ret[obj._k]._k;
            }
            return ret;
        });
    }
    check() {
        return __awaiter(this, void 0, void 0, function* () {
            const count = yield this.countDocuments();
            if (count > 5)
                return;
            console.log('Inserting lang collection default values');
            const lipthusDb = this.db.lipthusDb;
            yield exec('mongorestore --uri="' + lipthusDb.connectParams().uri + '" -d ' + lipthusDb.name + ' -c lang ' + this.db.lipthusDb.site.lipthusDir + '/configs/lang.bson');
        });
    }
}
exports.LipthusLanguageStatics = LipthusLanguageStatics;
