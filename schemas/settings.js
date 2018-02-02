"use strict";

const {BinDataFile, MultilangText} = require('../modules');
const {LipthusSchema} = require('../lib');

module.exports = function settings() {

    //noinspection JSUnresolvedVariable
    const s = new LipthusSchema({
        name: {type: String, unique: true},
        type: String,
        value: {
            type: LipthusSchema.Types.Mixed, noWatermark: true, get: function (val) {
                //noinspection JSUnresolvedVariable
                if (val && val.MongoBinData) { //noinspection JSUnresolvedFunction,JSUnresolvedVariable,JSPotentiallyInvalidUsageOfThis
                    return BinDataFile.fromMongo(val, {collection: 'settings', id: this._id, field: 'value'});
                }

                return val;
            }
        }
    }, {
        collection: 'settings',
        created: true,
        lastMod: true,
        modifier: true,
        identifier: 'name'
    });

    s.methods = {
        getValue(lang) {
            //noinspection JSUnresolvedVariable
            switch (this.type) {
                case 'ml':
                    //noinspection JSUnresolvedFunction
                    return new MultilangText(
                        this.value,
                        this.collection,
                        'value', this._id,
                        this.db.eucaDb.site
                    )
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
    };

    s.statics = {
        getValues(lang, query) {
            const ret = {};

            return this.find(query)
                .then(settings => Promise.all(
                    settings.map(s => ret[s.name] = s.getValue(lang).then(v => ret[s.name] = v))
                ))
                .then(() => ret);
        },

        getValue(name, lang) {
            return this.findOne({name: name})
                .then(s => s && s.getValue(lang));
        },

        setValue(name, value, type) {
            const update = {value: value};

            if (type)
                update.type = type;

            return this.update({name: name}, update, {upsert: true});
        }
    };

    return s;
};
