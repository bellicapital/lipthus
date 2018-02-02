"use strict";

const {BinDataFile} = require('../modules');
const gm = require('gm').subClass({imageMagick: true});
const fs = require('fs');

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
module.exports = function(req, res, next){
	const r = /^(\d+)x(\d+)k?([01]?)_(.+)$/.exec(req.params.p);

	if(!r)
		return next();

	let opt = {
		tag: 'local-image',
		width: parseInt(r[1]),
		height: parseInt(r[2]),
		crop: !!r[3],
		name: r[4]
	};

	const file = req.site.dir + '/public/img/' + opt.name;

	if(!fs.existsSync(file))
		return next();

	opt.mtime = fs.statSync(file).mtime;

	function checkSize(){
		return new Promise((ok, ko) => {
			if (opt.width && opt.height)
				return ok();

			gm(file).size((err, size) => {
				if (err)
					return ko(err);

				opt.width = size.width;
				opt.height = size.height;

				ok();
			});
		});
	}

	checkSize()
		.then(() => req.db.cache.findOne(opt))
		.then(cached => {
			if(cached)
				return BinDataFile.fromMongo(cached).send(req, res);

			return BinDataFile.fromFile(file)
				.then(bdf => {
					const mime = require('mime').lookup(file);

					const gmi = gm(bdf.MongoBinData.buffer)
						.setFormat(bdf.contentType.split('/')[1])
						.resize(opt.width, opt.height, opt.crop && '^');

					if(opt.crop)
						gmi.gravity('Center').crop(opt.width, opt.height);

					gmi.toBuffer((err, buffer) => {
						if(err)
							return next(new Error(err.message));

						req.db.cache
							.create(Object.extend({
								contentType: mime,
								MongoBinData: buffer,
								srcmd5: bdf.md5
							}, opt))
							.then(cached => BinDataFile.fromMongo(cached).send(req, res))
							.catch(next);
					});
				});
		})
		.catch(next);
};
