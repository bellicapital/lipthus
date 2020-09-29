"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleBdiRequest = void 0;
const mongoose_1 = require("mongoose");
const cached_file_1 = require("../classes/cached-file");
const fs_1 = require("fs");
const path = require("path");
function default_1(req, res, next) {
    handleBdiRequest(req, res, notCached)
        .catch(next);
}
exports.default = default_1;
async function handleBdiRequest(req, res, bdiGetter) {
    try {
        const fn = req.site.srcDir + '/.cache' + decodeURIComponent(req.path);
        const f = cached_file_1.CachedFile.get(fn);
        if (f)
            return f.send(res);
        const b = await bdiGetter(req);
        if (!b) {
            // noinspection ExceptionCaughtLocallyJS
            throw 404;
        }
        const dir = path.dirname(fn);
        if (!fs_1.existsSync(dir))
            await fs_1.promises.mkdir(path.dirname(fn), { recursive: true });
        await fs_1.promises.writeFile(fn, b);
        const newFile = new cached_file_1.CachedFile(fn);
        newFile.send(res);
    }
    catch (err) {
        if (err === 404)
            return res.status(404).render(req.site.lipthusDir + '/views/status/404');
        throw err;
    }
}
exports.handleBdiRequest = handleBdiRequest;
async function notCached(req) {
    let colName = req.params.col.replace('dynobjects.', '');
    let collection = req.db[colName];
    if (!collection) {
        if (colName.indexOf('.') > 0) {
            const m = colName.split('.', 2);
            const dbName = m[0];
            if (!req.site.dbs[dbName])
                throw 404;
            colName = m[1];
            collection = req.site.dbs[dbName][colName];
        }
        else {
            const dbs = req.site.dbs;
            Object.values(dbs).some(db => {
                if (db[colName])
                    collection = db[colName];
                return !!db[colName];
            });
        }
    }
    if (!collection || !req.params.id || !mongoose_1.Types.ObjectId.isValid(req.params.id) || !req.params.field)
        throw 404;
    const obj = await collection
        .findOneField(req.params.id, req.params.field);
    if (!obj)
        throw 404;
    if (obj.contentType.indexOf('svg') !== -1)
        return obj.MongoBinData.buffer;
    let wm = req.site.config.watermark;
    if (wm && collection.schema) {
        const itemPath = collection.schema.paths[req.params.field] || collection.schema.paths[req.params.field.replace(/\..+$/, '')];
        if (itemPath && itemPath.options.noWatermark)
            wm = null;
    }
    if (!req.params.p && !wm)
        return obj.MongoBinData.buffer;
    if (req.params.p === '_original')
        return obj.originalImage.MongoBinData.buffer;
    const opt = {
        'ref.id': new mongoose_1.Types.ObjectId(req.params.id),
        'ref.field': req.params.field,
        crop: false
    };
    if (req.params.name) {
        const r2 = req.params.name.match(/^.+\.(\w+)+$/);
        if (r2)
            opt.format = r2[1];
    }
    const r = /^(\d+)x(\d+)k?([01]?)m?(.*)$/.exec(req.params.p);
    if (r) {
        opt.crop = !!r[3];
        Object.assign(opt, {
            width: parseInt(r[1], 10),
            height: parseInt(r[2], 10),
            nwm: r[4]
        });
    }
    else if (/^[a-f0-9]+$/i.test(req.params.p)) {
        Object.assign(opt, {
            width: obj.width,
            height: obj.height,
            nwm: req.params.p
        });
    }
    else if (!wm) {
        throw 404;
    }
    opt.wm = wm;
    if (wm && (!opt.wm.type || (opt.nwm && opt.nwm === obj.md5)))
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
            geometry: opt.wm.geometry,
            opacity: opt.wm.opacity,
            ratio: opt.wm.ratio
        };
    }
    delete opt.nwm;
    if (!opt.width && !opt.wm)
        return obj.MongoBinData.buffer;
    return obj.toBuffer(opt);
}
