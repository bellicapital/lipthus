"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const modules_1 = require("../modules");
const fs_1 = require("fs");
const util_1 = require("util");
const bdf_1 = require("./bdf");
const gm = require('gm').subClass({ imageMagick: true });
function default_1(req, res, next) {
    bdf_1.handleBdiRequest(req, res, notCached)
        .catch(next);
}
exports.default = default_1;
/**
 * Sends a resized image from public/img directory
 * Use /resimg/[width]x[height]k(crop)[01]_filename
 * ex: /resimg/340x200k1_logo.png, /resimg/340x200_logo.png
 *
 * @param req
 * @returns {*}
 */
async function notCached(req) {
    const r = /^\/resimg\/(\d+)x(\d+)k?([01]?)_(.+)$/.exec(req.path);
    if (!r)
        throw 404;
    const opt = {
        tag: 'local-image',
        width: parseInt(r[1], 10),
        height: parseInt(r[2], 10),
        crop: !!r[3],
        name: r[4]
    };
    const file = req.site.srcDir + '/public/img/' + opt.name;
    if (!fs_1.existsSync(file))
        throw 404;
    opt.mtime = fs_1.statSync(file).mtime;
    const bdf = await modules_1.BinDataFile.fromFile(file);
    const gmi = gm(bdf.MongoBinData.buffer)
        .setFormat(bdf.contentType.split('/')[1])
        .samplingFactor(2, 2)
        .strip()
        .quality(79)
        .resize(opt.width, opt.height, opt.crop && '^');
    if (opt.crop)
        gmi.gravity('Center').crop(opt.width, opt.height);
    return util_1.promisify(gmi.toBuffer.bind(gmi))();
}
