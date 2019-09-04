"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
exports.name = "cacheResponse";
// noinspection JSUnusedGlobalSymbols
function getSchema() {
    const s = new lib_1.LipthusSchema({
        uri: String,
        device: { type: String, index: true },
        lang: { type: String, index: true },
        expires: Date,
        contentType: String,
        MongoBinData: Buffer
    }, {
        collection: 'cache.response',
        created: true,
        lastMod: true
    });
    s.index({
        uri: 1,
        device: 1,
        lang: 1
    }, {
        unique: true
    });
    s.virtual('expired').get(function () {
        return this.expires.getTime() < Date.now();
    });
    s.statics = {
        clear: function () {
            return new Promise((ok, ko) => {
                // noinspection TypeScriptValidateJSTypes
                this.db.collection(this.schema.options.collection).drop((err) => {
                    err && err.message !== 'ns not found' ? ko(err) : ok();
                });
            });
        }
    };
    return s;
}
exports.getSchema = getSchema;
