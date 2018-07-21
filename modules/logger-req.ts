import * as morgan from "morgan";
import {LipthusRequest, LipthusResponse} from "../index";
import {NextFunction} from "express";
import {KeyAny} from "../interfaces/global.interface";

export default function (req: LipthusRequest, res: LipthusResponse, next: NextFunction) {
	const timers: KeyAny = {
		all: {start: res.now},
		cmjs: {start: res.now}
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

	if (process.env.NODE_ENV !== 'development') {
		next();
	} else {
		morgan.token('timers', () => timers.render ? res.timer : ' ');
		// morgan.token('device', () => req.device.type);

		morgan(':method :req[Host]:url :status :response-time ms :res[content-length] :timers')(req, res, function () {
			/*
		morgan(':method :req[Host]:url :status :response-time ms :res[content-length] :device :timers')(req, res, function(){
			res.logreq = {
				host: req.get('host'),
				url: req.originalUrl,
				method: req.method,
				created: new Date,
				agent: req.get('user-agent'),
				referer: req.get('referer'),
				initmem: process.memoryUsage()
			};

			req.app.wss.broadcast(res.logreq, '/logreq');
			*/

			next();
		});
	}
}
