"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const util_1 = require("util");
const pReadFile = util_1.promisify(fs_1.readFile);
const imagemin = require('imagemin');
const imageminGifsicle = require('imagemin-gifsicle');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminOptipng = require('imagemin-optipng');
const imageminSvgo = require('imagemin-svgo');
const imageminopt = {
    use: [
        imageminGifsicle(),
        imageminMozjpeg({ quality: 70 }),
        imageminOptipng(),
        imageminSvgo({ multipass: true })
    ]
};
function optimage(path) {
    return pReadFile(path)
        .then(optimageBuffer);
}
exports.optimage = optimage;
function optimageBuffer(buf) {
    return imagemin.buffer(buf, imageminopt);
}
exports.optimageBuffer = optimageBuffer;
