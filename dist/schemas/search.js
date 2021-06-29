"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
exports.name = 'search';
function getSchema() {
    const s = new lib_1.LipthusSchema({
        query: String
    }, {
        collection: 'searches',
        created: true,
        location: true
    });
    s.statics = {
        log: function (req, query) {
            return this.create({
                query: query,
                location: req.ipLocation
            });
        }
    };
    return s;
}
exports.getSchema = getSchema;
