import {BinDataFile} from "../modules";
import {existsSync, statSync} from "fs";
import {LipthusRequest, LipthusResponse} from "../index";
import {NextFunction} from "express";

const gm = require('gm').subClass({imageMagick: true});

/**
 * Sends a resized image from public/img directory
 * Use /resimg/[width]x[height]k(crop)[01]_filename
 * ex: /resimg/340x200k1_logo.png, /resimg/340x200_logo.png
 *
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
export default function (req: LipthusRequest, res: LipthusResponse, next: NextFunction) {
	const r = /^(\d+)x(\d+)k?([01]?)_(.+)$/.exec(req.params.p);

	if (!r)
		return next();

	const opt: any = {
		tag: 'local-image',
		width: parseInt(r[1], 10),
		height: parseInt(r[2], 10),
		crop: !!r[3],
		name: r[4]
	};

	const file = req.site.dir + '/public/img/' + opt.name;

	if (!existsSync(file))
		return next();

	opt.mtime = statSync(file).mtime;

	function checkSize(): Promise<void> {
		return new Promise((ok, ko) => {
			if (opt.width && opt.height)
				return ok();

			gm(file).size((err: Error, size: any) => {
				if (err)
					return ko(err);

				opt.width = size.width;
				opt.height = size.height;

				ok();
			});
		});
	}

	checkSize()
		.then(() => <any> req.db.cache.findOne(opt))
		.then((cached: any) => {
			if (cached)
				return BinDataFile.fromMongo(cached);

			return BinDataFile.fromFile(file)
				.then(bdf => {
					const mime = require('mime').getType(file);

					const gmi = gm(bdf.MongoBinData.buffer)
						.setFormat(bdf.contentType.split('/')[1])
						.resize(opt.width, opt.height, opt.crop && '^');

					if (opt.crop)
						gmi.gravity('Center').crop(opt.width, opt.height);

					return new Promise((ok, ko) => {
						gmi.toBuffer((err: Error, buffer: Buffer) => {
							if (err)
								throw new Error(err.message);

							req.db.cache
								.create(Object.assign({
									contentType: mime,
									MongoBinData: buffer,
									srcmd5: bdf.md5
								}, opt))
								.then((c: any) => BinDataFile.fromMongo(c))
								.then(ok)
								.catch(ko);
						});
					});
				});
		})
		.then(bdi => bdi.send(req, res))
		.catch(next);
}
