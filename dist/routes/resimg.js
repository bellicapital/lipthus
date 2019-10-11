"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
function notCached(req) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const bdf = yield modules_1.BinDataFile.fromFile(file);
        const gmi = gm(bdf.MongoBinData.buffer)
            .setFormat(bdf.contentType.split('/')[1])
            .samplingFactor(2, 2)
            .strip()
            .quality(79)
            .resize(opt.width, opt.height, opt.crop && '^');
        if (opt.crop)
            gmi.gravity('Center').crop(opt.width, opt.height);
        return util_1.promisify(gmi.toBuffer.bind(gmi))();
    });
}
