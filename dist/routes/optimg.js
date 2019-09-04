"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const optimage_1 = require("../lib/optimage");
const fs_1 = require("fs");
const util_1 = require("util");
const pStat = util_1.promisify(fs_1.stat);
const Mime = require('mime');
const { BinDataImage } = require('../modules');
function default_1(req, res, next) {
    const opt = {
        tag: 'opt-local-image',
        name: req.params.fn
    };
    const file = req.site.srcDir + '/public/img/' + opt.name;
    pStat(file)
        .then(rStat => {
        if (!rStat)
            return res.status(404).send('not found');
        opt.mtime = rStat.mtime;
        req.db.cache
            .findOne(opt)
            .then(cached => cached ||
            optimage_1.optimage(file)
                .then(r => req.db.cache.create(Object.assign(opt, {
                contentType: Mime.getType(opt.name),
                MongoBinData: r,
                size: r.length
            }))))
            .then(cached => BinDataImage.fromMongo(cached).send(req, res))
            .catch(next);
    });
}
exports.default = default_1;
