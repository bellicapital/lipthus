"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function lastModifiedPlugin(schema) {
    schema.add({ modified: Date });
    schema.pre('save', function (next) {
        const modifiedPaths = this.modifiedPaths();
        // if modifiedPaths includes created, not save for created plugin
        if (modifiedPaths.length && !this.modifiedPaths().includes('created'))
            this.set('modified', new Date);
        next();
    });
}
exports.lastModifiedPlugin = lastModifiedPlugin;
