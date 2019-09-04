"use strict";
const modules_1 = require("../modules");
const lib_1 = require("../lib");
const mongoose_1 = require("mongoose");
var LipthusSettings;
(function (LipthusSettings) {
    LipthusSettings.name = 'settings';
    const s = new lib_1.LipthusSchema({
        name: { type: String, unique: true },
        type: String,
        value: {
            type: lib_1.LipthusSchema.Types.Mixed, noWatermark: true
        }
    }, {
        collection: 'settings',
        identifier: 'name'
    });
    class SettingMethods {
        getValue(lang) {
            let value = this.get('value');
            if (value && value.MongoBinData)
                value = modules_1.BinDataFile.fromMongo(value, { collection: 'settings', id: this._id, field: 'value' });
            switch (this.get('type')) {
                case 'ml':
                    return new modules_1.MultilangText(value, this.collection, 'value', this._id, this.db.lipthusDb)
                        .getLangOrTranslate(lang);
                case 'bdi':
                    return Promise.resolve(value && value.info());
                case 'string':
                case 'boolean':
                default:
                    return Promise.resolve(value);
            }
        }
    }
    LipthusSettings.SettingMethods = SettingMethods;
    class SettingStatics {
        getValues(lang, query) {
            const ret = {};
            return this.find(query)
                .then((settings) => Promise.all(settings.map(st => ret[st.get('name')] = st.getValue(lang).then((v) => ret[st.get('name')] = v))))
                .then(() => ret);
        }
        getValue(key, lang) {
            return this.findOne({ name: key })
                .then((st) => st && st.getValue(lang));
        }
        setValue(key, value, type) {
            const update = { value: value };
            if (type) {
                update.type = type;
                if (value && type === 'ObjectId')
                    update.value = mongoose_1.Types.ObjectId(value);
            }
            return this.updateOne({ name: key }, update, { upsert: true });
        }
    }
    LipthusSettings.SettingStatics = SettingStatics;
    const methods = SettingMethods.prototype;
    Object.getOwnPropertyNames(methods).filter(pn => pn !== 'constructor').forEach(k => s.methods[k] = methods[k]);
    const statics = SettingStatics.prototype;
    Object.getOwnPropertyNames(statics).filter(pn => pn !== 'constructor').forEach(k => s.statics[k] = statics[k]);
    function getSchema() {
        return s;
    }
    LipthusSettings.getSchema = getSchema;
})(LipthusSettings || (LipthusSettings = {}));
module.exports = LipthusSettings;
