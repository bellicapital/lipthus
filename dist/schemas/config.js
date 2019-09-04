"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const modules_1 = require("../modules");
const debug = require("debug")('site:config');
let definitions;
const groupsByKey = {};
exports.name = 'config';
function getSchema(site) {
    if (!definitions) {
        definitions = require(site.lipthusDir + '/configs/configs');
        Object.keys(definitions).forEach((group) => Object.keys(definitions[group].configs).forEach(key => groupsByKey[key] = group));
    }
    const s = new lib_1.LipthusSchema({
        name: { type: String, unique: true },
        value: {
            type: lib_1.LipthusSchema.Types.Mixed
        }
    }, { collection: 'config' });
    s.methods = {
        getValue: function () {
            const val = this.get('value');
            const key = this.get('name');
            const definition = definitions[groupsByKey[key]];
            if (!definition) {
                debug('Deleting not defined Config ' + key);
                return this.collection.remove({ _id: this._id }).catch(console.error.bind(console));
            }
            if (definition.configs[key][0] === 'bdf')
                return modules_1.BinDataFile.fromMongo(val, { collection: 'config', id: this._id, field: 'value' });
            return val;
        }
    };
    /**
     * @param key
     * @param value
     * @returns {Promise|Promise.<{}>|*}
     */
    s.statics.changeValue = function (key, value) {
        return this.updateOne({ name: key }, { $set: { value: value } })
            .then(() => this.db.lipthusDb.site.config[key] = value);
    };
    return s;
}
exports.getSchema = getSchema;
