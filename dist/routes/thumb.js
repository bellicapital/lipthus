"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const modules_1 = require("../modules");
const mongoose_1 = require("mongoose");
const gm = require("gm");
function default_1(req, res, next) {
    const opt = {
        'ref.id': new mongoose_1.Types.ObjectId(req.params.id),
        crop: !!req.params.crop,
        width: parseInt(req.params.width, 10),
        height: parseInt(req.params.height, 10),
        nwm: req.params.nwm,
        wm: req.site.config.watermark
    };
    req.db.fs.findById(req.params.id)
        .then((obj) => {
        if (!obj)
            return;
        if (opt.wm && (!opt.wm.type || (opt.nwm && opt.nwm === obj.md5)))
            opt.wm = false;
        else {
            const minSize = req.site.config.wm_minsize.split('x');
            if (minSize[0] > opt.width || minSize[1] > opt.height)
                opt.wm = false;
        }
        if (opt.wm && opt.wm.type === 2) {
            opt.wm = {
                type: 2,
                image: req.site.srcDir + '/' + opt.wm.image,
                gravity: opt.wm.gravity,
                geometry: opt.wm.geometry
            };
        }
        delete opt.nwm;
        return obj.getThumb()
            .then((bdf) => {
            if (bdf)
                return bdf;
            const name = obj.filename + '-' + opt.width + 'x' + opt.height + '.png';
            return req.db.cache
                .findOne({ name: name })
                .then(cached => {
                if (cached)
                    return modules_1.BinDataFile.fromMongo(cached);
                return new Promise((ok, ko) => {
                    gm(opt.width, opt.height, 'aliceblue')
                        .setFormat('png')
                        .fill('dimgray')
                        .drawText(0, 0, name, 'Center')
                        .toBuffer((err, buffer) => {
                        if (err)
                            return ko(err);
                        const date = new Date();
                        req.db.cache.create({
                            contentType: 'image/png',
                            size: buffer.length,
                            uploadDate: date,
                            mtime: date,
                            name: name,
                            MongoBinData: buffer
                        })
                            .then((c) => modules_1.BinDataFile.fromMongo(c))
                            .then(ok)
                            .catch(ko);
                    });
                });
            })
                .catch(next);
        });
    })
        .then((bdf) => {
        if (bdf)
            return bdf.send(req, res, opt);
        else
            return res.status(404).render(req.site.lipthusDir + '/views/status/404');
    })
        .catch(next);
}
exports.default = default_1;
