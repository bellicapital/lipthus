"use strict";
module.exports = function loggerUpdates(Schema) {
    const s = new Schema({
        schema_: String,
        itemid: Schema.Types.ObjectId,
        field: String,
        value: {},
        uid: { type: Schema.Types.ObjectId, ref: 'user' }
    }, {
        collection: 'logger.updates',
        versionKey: false,
        created: false
    });
    s.statics = {};
    return s;
};
