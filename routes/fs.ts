import {LipthusRequest, LipthusResponse} from "../index";
import {NextFunction} from "express";

export function fsRoute (req: LipthusRequest, res: LipthusResponse, next: NextFunction) {
	const p = req.params.id.split('.');
	let db;
	let id;

	if (p.length === 1) {
		db = req.site.db;
		id = p[0];
	} else {
		db = req.site.dbs[p[0]];
		id = p[1];
	}

	db.fs.get(id).send(req, res)
		.catch(next);
}
