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
const optimage_1 = require("../lib/optimage");
const fs_1 = require("fs");
const bdf_1 = require("./bdf");
function default_1(req, res, next) {
    bdf_1.handleBdiRequest(req, res, notCached)
        .catch(next);
}
exports.default = default_1;
function notCached(req) {
    return __awaiter(this, void 0, void 0, function* () {
        const r = /^\/optimg\/(.+)$/.exec(req.path);
        if (!r)
            return;
        const file = req.site.srcDir + '/public/img/' + r[1];
        if (!fs_1.existsSync(file))
            return;
        return optimage_1.optimage(file);
    });
}
