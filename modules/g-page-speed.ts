// Google Page Speed Insights flag
import {LipthusRequest, LipthusResponse} from "../index";
import {NextFunction} from "express";

export const GPageSpeedMiddleWare = (req: LipthusRequest, res: LipthusResponse, next: NextFunction) => {
	if (req.query.gpsi !== undefined)
		res.locals.gpsi = req.query.gpsi !== false;
	else if (req.site.config.detect_gpsi) {
		const ua = req.get('user-agent');

		res.locals.gpsi = ua && ua.indexOf('Speed Insights') > 0;
	}

	next();
};
