"use strict";

const {BinDataFile} = require('../modules');
const {ObjectId} = require('mongoose').Types;
const gm = require( 'gm' );

module.exports = function(req, res, next){
	req.db.fs.findById(req.params.id)
		.then(obj => {
			if(!obj)
				return res.status(404).render(req.cmsDir + '/views/status/404');

			const opt = {
				'ref.id': new ObjectId(req.params.id),
				crop: !!req.params.crop,
				width: parseInt(req.params.width),
				height: parseInt(req.params.height),
				nwm: req.params.nwm,
				wm: req.site.watermark
			};

			if(opt.wm && (!opt.wm.type || (opt.nwm && opt.nwm === obj.md5)))
				opt.wm = false;
			else {
				const minsize = req.site.config.wm_minsize.split('x');

				if(minsize[0] > opt.width || minsize[1] > opt.height)
					opt.wm = false;
			}

			if(opt.wm && opt.wm.type === 2){
				opt.wm = {
					type: 2,
					image: req.site.dir + '/' + opt.wm.image,
					gravity: opt.wm.gravity,
					geometry: opt.wm.geometry
				};
			}

			delete opt.nwm;

			obj.getThumb(function(err, bdf){
				if(err)
					return next(err);

				if(bdf)
					return bdf.send(req, res, opt);

				const name = obj.filename + '-' + opt.width + 'x' + opt.height + '.png';

				req.db.cache
					.findOne({name: name})
					.then(cached => {
						if (cached)
							return BinDataFile.fromMongo(cached).send(req, res);

						gm(opt.width, opt.height, 'aliceblue')
							.setFormat('png')
							.fill('dimgray')
							.drawText(0, 0, name, 'Center')
							.toBuffer((error, buffer) => {
									if (error)
										return next(err);

									const date = new Date();

									req.db.cache.create({
										contentType: 'image/png',
										size: buffer.length,
										uploadDate: date,
										mtime: date,
										name: name,
										MongoBinData: buffer
									})
										.then(cached => BinDataFile.fromMongo(cached).send(req, res));
								}
							);
					})
					.catch(next);
			});
		})
		.catch(next);
};
