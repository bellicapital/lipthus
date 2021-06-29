"use strict";
// jj 27-06-20 · used anywhere???
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
exports.name = 'translated';
function getSchema() {
    const s = new lib_1.LipthusSchema({
        from: String,
        to: { type: String, required: true },
        dbname: { type: String, required: true },
        colname: { type: String, required: true },
        itemid: { type: lib_1.LipthusSchema.Types.ObjectId, required: true },
        field: { type: String, required: true },
        uid: { type: lib_1.LipthusSchema.Types.ObjectId, required: true, ref: 'user' },
        words: Number,
        submitter: { type: lib_1.LipthusSchema.Types.ObjectId, ref: 'user' },
        modifier: { type: lib_1.LipthusSchema.Types.ObjectId, ref: 'user' }
    }, {
        collection: 'translated',
        created: true,
        modified: true
    });
    s.index({ col: 1, itemid: 1, field: 1, to: 1 }, { unique: true, dropDups: true });
    return s;
}
exports.getSchema = getSchema;
