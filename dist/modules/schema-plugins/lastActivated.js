"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function lastActivated(schema) {
    schema.add({ lastActivated: Date });
    schema.index({ lastActivated: 1 });
    schema.pre('save', function (next) {
        if (this.isDirectModified('active') && this.active)
            this.lastActivated = new Date;
        next();
    });
}
exports.lastActivated = lastActivated;
