"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
exports.name = "cache";
// noinspection JSUnusedGlobalSymbols
function getSchema() {
    const s = new lib_1.LipthusSchema({
        name: { type: String, index: true },
        expires: Date,
        contentType: String,
        tag: String,
        mtime: Date,
        MongoBinData: Buffer,
        source: { type: String, index: true },
        srcmd5: String,
        ref: {},
        width: Number,
        height: Number,
        crop: Boolean,
        size: Number,
        wm: {}
    }, {
        created: true,
        lastMod: true
    });
    s.pre("save", function (next) {
        if (!this.expires) {
            const expires = new Date();
            this.set('expires', expires.setDate(expires.getDate() + 30));
        }
        next();
    });
    return s;
}
exports.getSchema = getSchema;
