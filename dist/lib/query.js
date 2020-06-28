"use strict";
/**
 * extends mongoose.Query
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Query = void 0;
const mongoose_1 = require("mongoose");
Object.defineProperty(exports, "Query", { enumerable: true, get: function () { return mongoose_1.Query; } });
/**
 * Usage Thing
 *     .find({ name: /^hello/ })
 *     .values()
 *
 * @param {object} req
 * @returns {Promise.<Array>} DocValues array in the given language
 */
mongoose_1.Query.prototype.values = function (req) {
    if (!req)
        throw new Error('req param required');
    if (/^find(ById|One)/.test(this.op))
        return this.exec().then((doc) => doc && doc.getValues(req));
    const ret = [];
    /**
     * mongoose.QueryCursor
     */
    const cursor = this.cursor();
    return cursor.eachAsync((doc) => doc.getValues(req).then((v) => ret.push(v))).then(() => ret);
};
