import * as morgan from "morgan";
import {LipthusRequest, LipthusResponse} from "../index";
import {NextFunction} from "express";
import {KeyAny} from "../interfaces/global.interface";

export = function (req: LipthusRequest, res: LipthusResponse, next: NextFunction) {

	const timers: KeyAny = {
		all: {start: res.now},
		lipthus: {start: res.now}
	};

	res.timer = {
		start: (k: string) => timers[k] = {start: Date.now()},
		end: (k: string, log?: boolean) => {
			const ret = timers[k].time || (timers[k].time = Date.now() - timers[k].start);

			if (log)
				console.log('Timer ' + k + ': ' + ret);

			return ret;
		},
		json: () => {
			const ret: any = {};

			Object.keys(timers).forEach(k => ret[k] = res.timer.end(k));

			return ret;
		},
		toString: () => JSON.stringify(res.timer.json())
	};

	morgan.token('timers', () => timers.render ? res.timer : ' ');

	// @ts-ignore
	morgan(':method :req[Host]:url :status :response-time ms :res[content-length] :timers')(req, res, next);
};
