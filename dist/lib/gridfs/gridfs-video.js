"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const gridfs_file_1 = require("./gridfs-file");
class GridFSVideo extends gridfs_file_1.GridFSFile {
    info() {
        const ret = super.info();
        if (this.width) {
            ret.width = this.width;
            ret.height = this.height;
            ret.duration = this.duration;
        }
        return ret;
    }
    load() {
        return super.load()
            .then((file) => file);
    }
    // noinspection JSUnusedGlobalSymbols
    setThumbByPosition(position) {
        return this.getVideoFrame(position).then((bdf) => {
            if (bdf) {
                bdf.setColRef({
                    collection: this.namespace + '.files',
                    id: this._id,
                    field: 'thumb'
                });
                return this.update({ thumb: bdf });
            }
        })
            .then(() => this.thumb);
    }
}
exports.GridFSVideo = GridFSVideo;
