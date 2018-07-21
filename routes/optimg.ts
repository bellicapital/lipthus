import {optimage} from "../lib/optimage";
import {LipthusRequest, LipthusResponse} from "../index";
import {NextFunction} from "express";
import {stat} from "fs";
import {promisify} from "util";

const pStat = promisify(stat);
const Mime = require('mime');
const {BinDataImage} = require('../modules');

export default function (req: LipthusRequest, res: LipthusResponse, next: NextFunction) {
	const opt: any = {
		tag: 'opt-local-image',
		name: req.params.fn
	};

	const file = req.site.dir + '/public/img/' + opt.name;

	pStat(file)
		.then(rStat => {
			if (!rStat)
				return res.status(404).send('not found');

			opt.mtime = rStat.mtime;

			req.db.cache
				.findOne(opt)
				.then(cached => cached ||
					optimage(file)
						.then(r =>
							req.db.cache.create(Object.assign(opt, {
								contentType: Mime.getType(opt.name),
								MongoBinData: r,
								size: r.length
							}))
						)
				)
				.then(cached => BinDataImage.fromMongo(cached).send(req, res))
				.catch(next);
		});
}
