import {NextFunction} from "express";
import {LipthusRequest, LipthusResponse} from "../index";
import {BinDataFile} from "../modules";
import {GridFSFile} from "../lib";
import {Types} from "mongoose";

export default function (req: LipthusRequest, res: LipthusResponse, next: NextFunction) {
	let colName = req.params.col.replace('dynobjects.', '');
	let collection = req.db[colName];

	if (!collection) {
		if (colName.indexOf('.') > 0) {
			const m = colName.split('.', 2);
			const dbName = m[0];

			colName = m[1];

			collection = req.site.dbs[dbName][colName];
		} else {
			const dbs = req.site.dbs;

			Object.values(dbs).some(db => {
				if (db[colName])
					collection = db[colName];

				return !!db[colName];
			});
		}
	}

	if (!collection || !req.params.id || !Types.ObjectId.isValid(req.params.id) || !req.params.field)
		return res.status(404).end();

	collection
		.findOneField(req.params.id, req.params.field)
		.then((obj: any) => {
			if (!obj)
				return res.status(404).render(req.site.lipthusDir + '/views/status/404');

			if (typeof obj === 'string')
				obj = BinDataFile.fromString(obj, {
					collection: colName,
					id: new Types.ObjectId(req.params.id),
					field: req.params.field
				});
			else { // noinspection SuspiciousInstanceOfGuard
				if (!(obj instanceof BinDataFile) && !(obj instanceof GridFSFile))
					obj = BinDataFile.fromMongo(obj);
			}

			if (!obj)
				return res.status(404).end();

			if (obj.contentType.indexOf('svg') !== -1)
				return obj.send(req, res);

			let wm = req.site.config.watermark;

			if (wm && collection.schema) {
				const path = collection.schema.paths[req.params.field] || collection.schema.paths[req.params.field.replace(/\..+$/, '')];

				if (path && path.options.noWatermark)
					wm = null;
			}

			if (!req.params.p && !wm)
				return obj.send(req, res);

			const opt: any = {
				'ref.id': new Types.ObjectId(req.params.id),
				'ref.field': req.params.field,
				crop: false
			};

			if (req.params.name) {
				const r2 = req.params.name.match(/^.+\.(\w+)+$/);

				if (r2)
					opt.format = r2[1];
			}

			const r = /^(\d+)x(\d+)k?([01]?)m?(.*)$/.exec(req.params.p);

			if (r) {
				opt.crop = !!r[3];

				Object.assign(opt, {
					width: parseInt(r[1], 10),
					height: parseInt(r[2], 10),
					nwm: r[4]
				});
			} else if (/^[a-f0-9]+$/i.test(req.params.p)) {
				Object.assign(opt, {
					width: obj.width,
					height: obj.height,
					nwm: req.params.p
				});
			} else if (!wm) {
				res.send(404);
				return;
			}

			opt.wm = wm;

			if (wm && (!opt.wm.type || (opt.nwm && opt.nwm === obj.md5)))
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
					geometry: opt.wm.geometry,
					opacity: opt.wm.opacity,
					ratio: opt.wm.ratio
				};
			}

			delete opt.nwm;

			if (!opt.width && !opt.wm)
				return obj.send(req, res);

			return obj.send(req, res, opt);
		})
		.catch(next);
}
