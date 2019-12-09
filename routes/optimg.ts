import {optimage} from "../lib/optimage";
import {LipthusRequest, LipthusResponse} from "../index";
import {NextFunction} from "express";
import {existsSync} from "fs";
import {handleBdiRequest} from "./bdf";

export default function (req: LipthusRequest, res: LipthusResponse, next: NextFunction) {
	handleBdiRequest(req, res, notCached)
		.catch(next);
}

async function notCached (req: LipthusRequest) {
	const r = /^\/optimg\/(.+)$/.exec(req.path);

	if (!r)
		return;

	const file = req.site.srcDir + '/public/img/' + r[1];

	if (!existsSync(file))
		return;

	return optimage(file);
}
