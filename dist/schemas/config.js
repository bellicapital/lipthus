"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const modules_1 = require("../modules");
let definitions;
const groupsByKey = {};
function getDefinition(key) {
    if (!definitions[groupsByKey[key]]) {
        console.warn('Config ' + key + ' not defined');
        return [];
    }
    return definitions[groupsByKey[key]].configs[key];
}
exports.name = 'config';
function getSchema(site) {
    if (!definitions) {
        definitions = require(site.lipthusDir + '/configs/configs');
        Object.keys(definitions).forEach((group) => Object.keys(definitions[group].configs).forEach(key => groupsByKey[key] = group));
    }
    const s = new lib_1.LipthusSchema({
        name: { type: String, unique: true },
        value: {
            type: lib_1.LipthusSchema.Types.Mixed,
            get: function (val) {
                if (this.name && getDefinition(this.get('name'))[0] === 'bdf')
                    return modules_1.BinDataFile.fromMongo(val, { collection: 'config', id: this._id, field: 'value' });
                return val;
            }
        }
    }, { collection: 'config' });
    /**
     * @param key
     * @param value
     * @returns {Promise|Promise.<{}>|*}
     */
    s.statics.changeValue = function (key, value) {
        return this.update({ name: key }, { $set: { value: value } })
            .then(() => this.db.eucaDb.site.config[key] = value);
    };
    return s;
}
exports.getSchema = getSchema;
