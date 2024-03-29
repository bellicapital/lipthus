import {NextFunction} from "express";
import {LipthusRequest, LipthusResponse} from "../index";
import {LipthusLogger} from "./logger";

const fs = require('fs');

const getView = (status: string, req: LipthusRequest) => {
	let ret = null;

	if (/^50.$/.test("500"))
		status = '50x';

	req.app.get('views').some((view: string) => {
		if (fs.existsSync(view + '/status/' + status + '.pug')) {
			ret = status;

			return true;
		}
	});

	return 'status/' + (ret || 'error');
};

export async function errorHandler(err_: Error | string, req: LipthusRequest, res: LipthusResponse, next: NextFunction) {
	let err: StatusError;

	if (!(err_ instanceof Error)) {
		err = new Error() as StatusError;

		if (!isNaN(+err_))
			err.status = parseInt(err_, 10);
	} else
		err = err_ as StatusError;

	if (err.status === 401) {
		if (!res.headersSent) {
			return res.redirect('/login/?referrer=' + encodeURIComponent(req.originalUrl));
		}

		return next();
	}

	if (err.status === 403) {
		if (!res.headersSent) {
			return res.status(err.status).render(req.site.lipthusDir + '/views/status/403', {
				path: req.path,
				referer: req.get('referer')
			});
		}

		return next();
	}

	if (err.status && err.status > 400 && err.status < 500)
		return next();

	if (!err.status)
		err.status = 500;

	res.status(err.status);

	await (req.logger || new LipthusLogger(req)).logError(err);

	err.message = "Exception at " + req.originalUrl + "\n" + err.message;
	console.error(err);

	if (!res.headersSent) {
		// it could be previous to assign getUser
		if (req.getUser)
			await req.getUser();

		res.render(getView(err.status.toString(), req), {
			message: err.message, // @deprecated
			error: err
		});
	}
}

interface StatusError extends Error {
	status: number;
}
