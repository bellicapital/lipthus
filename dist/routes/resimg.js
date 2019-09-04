"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const modules_1 = require("../modules");
const fs_1 = require("fs");
const gm = require('gm').subClass({ imageMagick: true });
/**
 * Sends a resized image from public/img directory
 * Use /resimg/[width]x[height]k(crop)[01]_filename
 * ex: /resimg/340x200k1_logo.png, /resimg/340x200_logo.png
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
function default_1(req, res, next) {
    const r = /^\/resimg\/(\d+)x(\d+)k?([01]?)_(.+)$/.exec(req.path);
    if (!r)
        return next();
    const opt = {
        tag: 'local-image',
        width: parseInt(r[1], 10),
        height: parseInt(r[2], 10),
        crop: !!r[3],
        name: r[4]
    };
    const file = req.site.srcDir + '/public/img/' + opt.name;
    if (!fs_1.existsSync(file))
        return next();
    opt.mtime = fs_1.statSync(file).mtime;
    function checkSize() {
        return new Promise((ok, ko) => {
            if (opt.width && opt.height)
                return ok();
            gm(file).size((err, size) => {
                if (err)
                    return ko(err);
                opt.width = size.width;
                opt.height = size.height;
                ok();
            });
        });
    }
    checkSize()
        .then(() => req.db.cache.findOne(opt))
        .then((cached) => {
        if (cached)
            return modules_1.BinDataFile.fromMongo(cached);
        return modules_1.BinDataFile.fromFile(file)
            .then(bdf => {
            const mime = require('mime').getType(file);
            const gmi = gm(bdf.MongoBinData.buffer)
                .setFormat(bdf.contentType.split('/')[1])
                .samplingFactor(2, 2)
                .strip()
                .quality(79)
                .resize(opt.width, opt.height, opt.crop && '^');
            if (opt.crop)
                gmi.gravity('Center').crop(opt.width, opt.height);
            return new Promise((ok, ko) => {
                gmi.toBuffer((err, buffer) => {
                    if (err)
                        throw new Error(err.message);
                    req.db.cache
                        .create(Object.assign({
                        contentType: mime,
                        MongoBinData: buffer,
                        srcmd5: bdf.md5
                    }, opt))
                        .then((c) => modules_1.BinDataFile.fromMongo(c))
                        .then(ok)
                        .catch(ko);
                });
            });
        });
    })
        .then(bdi => bdi.send(req, res))
        .catch(next);
}
exports.default = default_1;
