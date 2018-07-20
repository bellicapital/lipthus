"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("mz/fs");
const imagemin = require('imagemin');
const imageminGifsicle = require('imagemin-gifsicle');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminOptipng = require('imagemin-optipng');
const imageminSvgo = require('imagemin-svgo');
const imageminopt = {
    use: [
        imageminGifsicle(),
        imageminMozjpeg(),
        imageminOptipng(),
        imageminSvgo({ multipass: true })
    ]
};
function optimage(path) {
    return fs_1.readFile(path)
        .then((buf) => imagemin.buffer(buf, imageminopt));
}
exports.optimage = optimage;
