"use strict";

const {BinDataFile} = require('../modules');
const {GridFSFile} = require('../lib');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports = function(req, res, next){
	let colname = req.params.col.replace('dynobjects.', '');
	let collection = req.db[colname];

	if(!collection){
		if(colname.indexOf('.')>0){
			const m = colname.match(/(^[^.]+)\.(.+)$/);
			const dbname = m[1];

			colname = m[2];

			collection = req.site.dbs[dbname][colname];
		} else {
			const dbs = req.site.dbs;

			Object.values(dbs).forEach(db => {
				if(db[colname])
					collection = db[colname];
			});
		}
	}

	if(!collection || !req.params.id || !ObjectId.isValid(req.params.id) || !req.params.field)
		return res.status(404).end();

	collection
		.findOneField(req.params.id, req.params.field)
		.then(obj => {
			if(!obj)
				return res.status(404).render(req.site.lipthusDir + '/views/status/404');

			if(typeof obj === 'string')
				obj = BinDataFile.fromString(obj, {
					collection: colname,
					id: new ObjectId(req.params.id),
					field: req.params.field
				});
			else if(!(obj instanceof BinDataFile) && !(obj instanceof GridFSFile))
				obj = BinDataFile.fromMongo(obj);

			if(!obj)
				return res.status(404).end();

			if(obj.contentType.indexOf('svg') !== -1)
				return obj.send(req, res);

			//req.site.watermark permite a los sitios sobrescribir la marca de agua
			let wm = req.site.watermark || req.site.config.watermark;

			if(wm && collection.schema){
				const path = collection.schema.paths[req.params.field] || collection.schema.paths[req.params.field.replace(/\..+$/, '')];

				if(path && path.options.noWatermark)
					wm = null;
			}

			if(!req.params.p && !wm){
				obj.send(req, res);
				return;
			}

			const r = /^(\d+)x(\d+)k?([01]?)m?(.*)$/.exec(req.params.p);
			const opt = {
				'ref.id': new ObjectId(req.params.id),
				'ref.field': req.params.field,
				crop: false
			};

			if(req.params.name){
				const r = req.params.name.match(/^.+\.(\w+)+$/, "$1");

				if(r)
					opt.format = r[1];
			}

			if(r){
				opt.crop = !!r[3];

				Object.assign(opt, {
					width: parseInt(r[1]),
					height: parseInt(r[2]),
					nwm: r[4]
				});
			} else if(/^[a-f0-9]+$/i.test(req.params.p)){
				Object.assign(opt, {
					width: obj.width,
					height: obj.height,
					nwm: req.params.p
				});
			} else if(!wm){
				res.send(404);
				return;
			}

			opt.wm = wm;

			if(wm && (!opt.wm.type || (opt.nwm && opt.nwm === obj.md5)))
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
					geometry: opt.wm.geometry,
					opacity: opt.wm.opacity
				};
			}

			delete opt.nwm;

			if(!opt.width && !opt.wm)
				return obj.send(req, res);

			obj.send(req, res, opt, next);
		})
		.catch(next);
};
