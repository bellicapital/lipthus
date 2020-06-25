"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachedFile = void 0;
const fs_1 = require("fs");
class CachedFile {
    constructor(file, params = { maxAge: '30d' }) {
        this.file = file;
        this.params = params;
    }
    static get(file, params) {
        if (fs_1.existsSync(file))
            return new CachedFile(file, params);
    }
    send(res) {
        res.sendFile(this.file, this.params);
    }
}
exports.CachedFile = CachedFile;
