import {NextFunction, Router} from "express";
import {LipthusRequest, LipthusResponse} from "../index";
import {CssResponse} from "../interfaces/global.interface";

const send = (req: LipthusRequest, res: LipthusResponse, next: NextFunction) => {
	res.set('Expires', new Date().addDays(60).toUTCString());

	switch (req.params.ext) {
		case 'css':
			res.type('css').set('X-SourceMap', req.lessSourceMap + '.map');
			break;
		case 'map':
			res.type('text');
			break;
		default:
			return next();
	}

	res.send((req.cssResponse as any)[req.params.ext]);
};

const combined = (req: LipthusRequest, res: LipthusResponse, next: NextFunction) => {
	const parts: Array<string> = req.params.combined.split('+');
	const files: Array<string> = [];
	const dirs: any = {
		d: req.site.dir,
		g: req.site.lipthusDir
	};
	const devicesDir: any = {
		g: '',
		p: 'phone/',
		t: 'tablet/',
		v: 'tv/',
		b: 'bot/',
		c: 'car/'
	};

	if (!parts.length)
		return next();

	parts.some((part, idx) => {
		const m = part.match(/([dg])(\w)-(.+)$/);

		if (!m) {
			next(); // -> not found

			return true;
		}

		req.lessSourceMap = req.params.combined.replace(/\//g, '%2F');

		files.push(dirs[m[1]] + '/public/css/' + devicesDir[m[2]] + m[3] + '.less');

		if (idx === parts.length - 1)
			req.db.cacheless.getCachedFiles(files, req.lessSourceMap)
				.then((r: CssResponse) => req.cssResponse = r)
				.then(() => next(), next);

		return false;
	});
};

const single = (req: LipthusRequest, res: LipthusResponse, next: NextFunction) => {
	const deviceRoute = req.params.device !== 'g' ? req.params.device + '/' : '';
	const locations: any = {
		d: req.site.dir,
		g: req.site.lipthusDir
	};
	let key = req.params.key;
	const loc = locations[req.params.loc] + '/public/css/' + deviceRoute;
	let compress = false;

	if (key.indexOf('.min') > 0) {
		key = key.replace('.min', '');
		compress = true;
	}

	req.lessSourceMap = req.params.key;

	req.db.cacheless
		.getCachedFile(loc + key + '.less', compress)
		.then((r: CssResponse) => req.cssResponse = r)
		.then(() => next(), next);
};

export = Router({strict: true})
	.get('/:loc/:device/:key.:ext', single as any, send as any)
	.get('/:combined.:mtime.:ext', combined as any, send as any);
