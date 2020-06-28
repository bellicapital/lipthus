"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitterPlugin = void 0;
const mongoose_1 = require("mongoose");
function submitterPlugin(schema) {
    schema.add({ submitter: { type: mongoose_1.Schema.Types.ObjectId, ref: 'user' } });
}
exports.submitterPlugin = submitterPlugin;
