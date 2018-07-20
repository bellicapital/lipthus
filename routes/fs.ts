import {LipthusRequest, LipthusResponse} from "../index";
import {NextFunction} from "express";

export function fsRoute (req: LipthusRequest, res: LipthusResponse, next: NextFunction) {
	req.site.db.fs.get(req.params.id).send(req, res)
		.catch(next);
};
