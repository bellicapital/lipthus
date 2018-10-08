import {readFile} from "fs";
import {promisify} from "util";

const pReadFile = promisify(readFile);
const imagemin = require('imagemin');
const imageminGifsicle = require('imagemin-gifsicle');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminOptipng = require('imagemin-optipng');
const imageminSvgo = require('imagemin-svgo');
const imageminopt = {
	use: [
		imageminGifsicle(),
		imageminMozjpeg({quality: 70}),
		imageminOptipng(),
		imageminSvgo({multipass: true})
	]
};

export function optimage (path: string) {
	return pReadFile(path)
		.then(optimageBuffer);
}

export function optimageBuffer (buf: Buffer) {
	return imagemin.buffer(buf, imageminopt);
}
