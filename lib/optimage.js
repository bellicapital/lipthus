"use strict";

const imagemin = require('imagemin');
const imageminGifsicle = require('imagemin-gifsicle');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminOptipng = require('imagemin-optipng');
const imageminSvgo = require('imagemin-svgo');
const fs = require('mz/fs');
const imageminopt = {
	use: [
		imageminGifsicle(),
		imageminMozjpeg(),
		imageminOptipng(),
		imageminSvgo({multipass: true})
	]
};

module.exports = path => fs.readFile(path)
	.then(buf => imagemin.buffer(buf, imageminopt));