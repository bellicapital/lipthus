"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const optimage_1 = require("../lib/optimage");
const fs_1 = require("fs");
const bdf_1 = require("./bdf");
function default_1(req, res, next) {
    bdf_1.handleBdiRequest(req, res, notCached)
        .catch(next);
}
exports.default = default_1;
async function notCached(req) {
    const r = /^\/optimg\/(.+)$/.exec(req.path);
    if (!r)
        return;
    const file = req.site.srcDir + '/public/img/' + r[1];
    if (!fs_1.existsSync(file))
        return;
    return optimage_1.optimage(file);
}
