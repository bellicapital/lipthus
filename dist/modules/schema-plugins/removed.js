"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removedPlugin = void 0;
function removedPlugin(schema) {
    schema.add({ removed: Boolean });
    // schema.index({removed: 1});
}
exports.removedPlugin = removedPlugin;
