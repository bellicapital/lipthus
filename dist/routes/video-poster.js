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
const index_1 = require("../index");
const bdf_1 = require("./bdf");
function default_1(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        bdf_1.handleBdiRequest(req, res, notCached)
            .catch(next);
    });
}
exports.default = default_1;
function notCached(req) {
    return __awaiter(this, void 0, void 0, function* () {
        const r = req.params.fn.match(/^([^-]+)(-(\d+)x?(\d*))?\.jpg$/);
        if (!r)
            throw 404;
        const id = r[1];
        const video = yield req.site.dbs[req.params.db].fsfiles.findById(id)
            .select('thumb');
        if (!video)
            throw 404;
        let thumb;
        if (!thumb) {
            const fullVideo = yield req.site.dbs[req.params.db].fs.getVideo(id).load();
            thumb = yield fullVideo.getThumb();
        }
        else
            thumb = index_1.BinDataImage.fromMongo(video.thumb);
        const width = parseInt(r[3], 10);
        if (!width)
            return video.thumb.MongoBinData.buffer;
        return thumb.toBuffer({
            width: width,
            height: parseInt(r[4], 10) || (video.thumb.height * width / video.thumb.width)
        });
    });
}
