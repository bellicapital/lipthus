"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const bdf_1 = require("./bdf");
async function default_1(req, res, next) {
    bdf_1.handleBdiRequest(req, res, notCached)
        .catch(next);
}
exports.default = default_1;
async function notCached(req) {
    // 1 => _id, 3 => mtime (used only to refresh), 5 => width, 6 => height
    const r = req.params.fn.match(/^([^-_]+)(_(\d+))?(-(\d+)x?(\d*))?\.jpg$/);
    if (!r)
        throw 404;
    const id = r[1];
    const video = await req.site.dbs[req.params.db].fsfiles.findById(id)
        .select('thumb');
    if (!video)
        throw 404;
    let thumb;
    if (!thumb) {
        const fullVideo = await req.site.dbs[req.params.db].fs.getVideo(id).load();
        thumb = await fullVideo.getThumb();
    }
    else
        thumb = index_1.BinDataImage.fromMongo(video.thumb);
    const width = parseInt(r[5], 10);
    if (!width)
        return video.thumb.MongoBinData.buffer;
    return thumb.toBuffer({
        width: width,
        height: parseInt(r[6], 10) || (video.thumb.height * width / video.thumb.width)
    });
}
