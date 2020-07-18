"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSchema = exports.name = void 0;
const lib_1 = require("../lib");
exports.name = 'logRoute';
function getSchema() {
    return new lib_1.LipthusSchema({
        url: String,
        start: Date,
        time: Number,
        memoryStart: {},
        memoryEnd: {},
        memoryDiff: {}
    }, {
        collection: 'log.route'
    });
}
exports.getSchema = getSchema;
