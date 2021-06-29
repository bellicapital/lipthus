"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
// noinspection JSUnusedGlobalSymbols
function expressMongoStream(params, db, req, res) {
    const defaults = {
        expireDays: 60,
        mtime: new Date(),
        disposition: 'inline',
        ns: 'fs',
        filename: 'file'
    };
    const opt = Object.assign({}, defaults, params);
    let start = 0;
    let end = opt.length - 1;
    res.type(opt.contentType);
    res.set('Accept-Ranges', 'bytes');
    res.set('Content-Disposition', opt.disposition + '; filename="' + opt.filename + '"');
    if (req.headers.range) {
        const r = /bytes[^\d]*(\d+)-(\d*)?/.exec(req.headers.range.toString());
        if (!r)
            throw new Error('headers.range parse error: ' + req.headers.range);
        start = parseInt(r[1], 10);
        if (r[2])
            end = parseInt(r[2], 10);
        res.status(206); // HTTP/1.1 206 Partial Content
        res.set('Content-Range', 'bytes ' + start + '-' + end + '/' + opt.length);
    }
    else
        res.set('Content-Length', opt.length.toString());
    res.set('Last-modified', opt.mtime.toUTCString());
    res.set('Etag', opt.length + '-' + opt.mtime.getTime());
    const expires = new Date();
    expires.setDate(expires.getDate() + params.expireDays);
    res.set('Expires', expires.toUTCString());
    if (opt.duration)
        res.set('X-Content-Duration', opt.duration + '');
    const bucket = new mongodb_1.GridFSBucket(db, { bucketName: opt.ns });
    const stream = bucket.openDownloadStream(opt.id, { start, end });
    stream.on('open', ev => console.log(ev));
    return stream.pipe(res);
}
exports.expressMongoStream = expressMongoStream;
