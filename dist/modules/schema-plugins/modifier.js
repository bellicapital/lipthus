"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
function modifierPlugin(schema) {
    // No funciona en mongoose 5.0.14!!!!!
    schema.add({ modifier: { type: mongoose_1.Schema.Types.ObjectId, ref: 'user' } });
    schema.methods.setModified = function (user) {
        return this.set({
            modified: new Date(),
            modifier: user
        });
    };
}
exports.modifierPlugin = modifierPlugin;
