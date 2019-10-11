import {BinDataFile} from "../modules";
import {existsSync, statSync} from "fs";
import {LipthusRequest, LipthusResponse} from "../index";
import {NextFunction} from "express";
import {promisify} from "util";
import {handleBdiRequest} from "./bdf";

const gm = require('gm').subClass({imageMagick: true});

export default function (req: LipthusRequest, res: LipthusResponse, next: NextFunction) {
	handleBdiRequest(req, res, notCached)
		.catch(next);
}

/**
 * Sends a resized image from public/img directory
 * Use /resimg/[width]x[height]k(crop)[01]_filename
 * ex: /resimg/340x200k1_logo.png, /resimg/340x200_logo.png
 *
 * @param req
 * @returns {*}
 */
async function notCached (req: LipthusRequest) {
	const r = /^\/resimg\/(\d+)x(\d+)k?([01]?)_(.+)$/.exec(req.path);

	if (!r)
		throw 404;

	const opt: any = {
		tag: 'local-image',
		width: parseInt(r[1], 10),
		height: parseInt(r[2], 10),
		crop: !!r[3],
		name: r[4]
	};

	const file = req.site.srcDir + '/public/img/' + opt.name;

	if (!existsSync(file))
		throw 404;

	opt.mtime = statSync(file).mtime;

	const bdf = await BinDataFile.fromFile(file);

	const gmi = gm(bdf.MongoBinData.buffer)
		.setFormat(bdf.contentType.split('/')[1])
		.samplingFactor(2, 2)
		.strip()
		.quality(79)
		.resize(opt.width, opt.height, opt.crop && '^');

	if (opt.crop)
		gmi.gravity('Center').crop(opt.width, opt.height);

	return promisify(gmi.toBuffer.bind(gmi))();
}
