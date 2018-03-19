import {LipthusRequest, LipthusResponse} from "../../index";
import {NextFunction} from "express";

const methods = Object.assign({},
	require('./main'),
	require('./item'),
	require('./config')
);

export function Setup(req: LipthusRequest, res: LipthusResponse, next: NextFunction) {
	const method = methods[req.params.method];

	if (!method)
		return next(404);

	return method(req, res)
		.then((r: any) => res.json(r))
		.catch(next);
}
