"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function lastModifiedPlugin(schema) {
    schema.add({ modified: Date });
    schema.pre('save', function (next) {
        if (this.modifiedPaths().length)
            this.modified = new Date;
        next();
    });
}
exports.lastModifiedPlugin = lastModifiedPlugin;
