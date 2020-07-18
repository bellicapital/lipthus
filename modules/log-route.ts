import {LipthusApplication, LipthusRequest, LipthusResponse} from "../index";
import {NextFunction} from "express";


export = (app: LipthusApplication) => {
	app.use(async (req: LipthusRequest, res: LipthusResponse, next: NextFunction) => {
		const config = await app.site.db.config.findOne({name: "logRoute"}).lean();
		app.site.config.logRoute = config.value;

		if (!app.site.config.logRoute)
			return next();

		const memoryStart = process.memoryUsage();
		const start = new Date();
		const logRoute = await app.db.logRoute.create({
			url: req.originalUrl,
			start,
			memoryStart
		});

		res.on('finish', () => {
			const memoryEnd = process.memoryUsage();
			const memoryDiff: any = {};

			Object.keys(memoryEnd).forEach(k => memoryDiff[k] = memoryEnd[k] - memoryStart[k]);
			logRoute.set({
				time: Date.now() - start.getTime(),
				memoryEnd,
				memoryDiff
			})
				.save();
		});

		next();
	});
};
