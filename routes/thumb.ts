import {BinDataFile, BinDataImage} from "../modules";
import {Types} from "mongoose";
import * as gm from "gm";
import {LipthusRequest, LipthusResponse} from "../index";
import {NextFunction} from "express";

export default function (req: LipthusRequest, res: LipthusResponse, next: NextFunction) {

	const opt = {
		'ref.id': new Types.ObjectId(req.params.id),
		crop: !!req.params.crop,
		width: parseInt(req.params.width, 10),
		height: parseInt(req.params.height, 10),
		nwm: req.params.nwm,
		wm: req.site.config.watermark
	};

	req.db.fs.findById(req.params.id)
		.then((obj: any): any => {
			if (!obj)
				return;

			if (opt.wm && (!opt.wm.type || (opt.nwm && opt.nwm === obj.md5)))
				opt.wm = false;
			else {
				const minSize = req.site.config.wm_minsize.split('x');

				if (minSize[0] > opt.width || minSize[1] > opt.height)
					opt.wm = false;
			}

			if (opt.wm && opt.wm.type === 2) {
				opt.wm = {
					type: 2,
					image: req.site.srcDir + '/' + opt.wm.image,
					gravity: opt.wm.gravity,
					geometry: opt.wm.geometry
				};
			}

			delete opt.nwm;

			return obj.getThumb()
				.then((bdf: BinDataImage) => {
					if (bdf)
						return bdf;

					const name = obj.filename + '-' + opt.width + 'x' + opt.height + '.png';

					return req.db.cache
						.findOne({name: name})
						.then(cached => {
							if (cached)
								return BinDataFile.fromMongo(cached);

							return new Promise((ok, ko) => {
								gm(opt.width, opt.height, 'aliceblue')
									.setFormat('png')
									.fill('dimgray')
									.drawText(0, 0, name, 'Center')
									.toBuffer((err: Error, buffer: Buffer) => {
										if (err)
											return ko(err);

										const date = new Date();
										const doc = {
											contentType: 'image/png',
											size: buffer.length,
											uploadDate: date,
											mtime: date,
											name: name,
											MongoBinData: buffer
										};

										// @ts-ignore
										req.db.cache.create(doc)
											.then((c: any) => BinDataFile.fromMongo(c))
											.then(ok)
											.catch(ko);
									});
							});
						})
						.catch(next);
				});
		})
		.then((bdf: BinDataImage | undefined): Promise<any> | void => {
			if (bdf)
				return bdf.send(req, res, opt);
			else
				return res.status(404).render(req.site.lipthusDir + '/views/status/404');
		})
		.catch(next);
}
