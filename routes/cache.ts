import {LipthusRequest, LipthusResponse} from "../index";
import {NextFunction} from "express";
import {BinDataFile} from "../modules";
import {Types} from "mongoose";

export default function (req: LipthusRequest, res: LipthusResponse, next: NextFunction) {
	if (!Types.ObjectId.isValid(req.params.id))
		return next();

	req.db.cache.findById(req.params.id)
		.then(file => {
			if (!file)
				return next();

			return BinDataFile.fromMongo(file).send(req, res);
		})
		.catch(next);
}
