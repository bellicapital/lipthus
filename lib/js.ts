// en desarrollo...

import {NextFunction, Router} from "express";
import {LipthusRequest, LipthusResponse} from "../index";

const js = (req: LipthusRequest, res: LipthusResponse, next: NextFunction) => {
	res.set('Expires', new Date().addDays(60).toUTCString());

	switch (req.params.ext) {
		case 'js':
			res.type('js').set('X-SourceMap', '.map');
			break;
		case 'map':
			res.type('text');
			break;
		default:
			return next();
	}

	res.send('on developement');
};

export = Router({strict: true})
	.get('/:loc/:device/:key.:ext', js as any)
	.get('/:combined.:mtime.:ext', js as any);
