"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileThumb = exports.FileInfo = void 0;
class FileInfo {
    constructor(values) {
        this.id = values.id;
        this.uri = values.uri;
        this.db = values.db;
        this.name = values.name || '';
        Object.assign(this, values);
    }
    // noinspection JSUnusedLocalSymbols
    getThumb(width, height, crop, enlarge) {
        let uri = '/videos/' + this.db + '.' + this.id + '/poster' + width + 'x' + height;
        if (crop)
            uri += 'k1';
        uri += '_' + this.basename;
        if (this.thumbTS)
            uri += '_' + this.thumbTS;
        uri += '.jpg';
        return new FileThumb({
            name: this.name,
            width: crop ? width : 0,
            height: crop ? height : 0,
            uri: uri,
            originalUri: this.uri,
            ts: this.thumbTS
        });
    }
}
exports.FileInfo = FileInfo;
class FileThumb {
    constructor(p) {
        this.name = p.name;
        this.width = p.width;
        this.height = p.height;
        this.uri = p.uri;
        this.originalUri = p.originalUri;
        this.ts = p.ts;
    }
    toHtml() {
        return '<a href="' + this.originalUri + '"><img src="' + this.uri + '" alt="' + this.name + '"/></a>';
    }
}
exports.FileThumb = FileThumb;
