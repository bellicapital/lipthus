"use strict";
const modules_1 = require("../modules");
const lib_1 = require("../lib");
var LipthusSettings;
(function (LipthusSettings) {
    LipthusSettings.name = 'settings';
    const s = new lib_1.LipthusSchema({
        name: { type: String, unique: true },
        type: String,
        value: {
            type: lib_1.LipthusSchema.Types.Mixed, noWatermark: true, get: function (val) {
                //noinspection JSUnresolvedVariable
                if (val && val.MongoBinData) { //noinspection JSUnresolvedFunction,JSUnresolvedVariable,JSPotentiallyInvalidUsageOfThis
                    return modules_1.BinDataFile.fromMongo(val, { collection: 'settings', id: this._id, field: 'value' });
                }
                return val;
            }
        }
    }, {
        collection: 'settings',
        identifier: 'name'
    });
    class SettingMethods {
        getValue(lang) {
            //noinspection JSUnresolvedVariable
            switch (this.type) {
                case 'ml':
                    //noinspection JSUnresolvedFunction
                    return new modules_1.MultilangText(this.value, this.collection, 'value', this._id, this.db.eucaDb.site)
                        .getLangOrTranslate(lang);
                case 'bdi':
                    //noinspection JSUnresolvedVariable
                    return Promise.resolve(this.value && this.value.info());
                case 'string':
                case 'boolean':
                default:
                    return Promise.resolve(this.value);
            }
        }
    }
    LipthusSettings.SettingMethods = SettingMethods;
    class SettingStatics {
        getValues(lang, query) {
            const ret = {};
            return this.find(query)
                .then((settings) => Promise.all(settings.map(st => ret[st.name] = st.getValue(lang).then((v) => ret[st.name] = v))))
                .then(() => ret);
        }
        getValue(key, lang) {
            return this.findOne({ name: key })
                .then((st) => st && st.getValue(lang));
        }
        setValue(key, value, type) {
            const update = { value: value };
            if (type)
                update.type = type;
            return this.update({ name: key }, update, { upsert: true });
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
