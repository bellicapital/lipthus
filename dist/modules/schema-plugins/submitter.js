"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
function submitterPlugin(schema) {
    schema.add({ submitter: { type: mongoose_1.Schema.Types.ObjectId, ref: 'user' } });
}
exports.submitterPlugin = submitterPlugin;
