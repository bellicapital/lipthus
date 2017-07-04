/**
 * Created by jj on 18/3/16.
 */

"use strict";

const Logger = require('./logger');
const fs = require('fs');

const getView = (status, req) => {
	let ret = null;

	if(/^50.$/ .test(500))
		status = '50x';

	req.app.get('views').some(view => {
		if(fs.existsSync(view + '/status/' + status + '.pug')){
			ret = status;

			return true;
		}
	});

	return 'status/' + (ret || 'error');
};

module.exports = function(err, req, res, next) {
	if(!(err instanceof Error) && !isNaN(err)) {
		const status = parseInt(err);
		err = new Error();
		err.status = status;
	}

	if(err.status === 401){
		if (!res.headersSent) {
			req.session.redirect_to = req.originalUrl;

			return res.redirect('/login');
		}

		return next();
	}

	if(err.status === 403){
		if (!res.headersSent) {
			req.session.redirect_to = req.originalUrl;

			return res.status(err.status).render(req.cmsDir + '/views/status/403', {
				path: req.path,
				referer: req.get('referer')
			});
		}

		return next();
	}

	if(err.status && err.status > 400 && err.status < 500)
		return next();

	if(!err.status)
		err.status = 500;

	res.status(err.status);

	(req.logger || new Logger(req)).logError(err).then(() => {
		console.error("Exception at " + req.originalUrl);
		console.error(err);
	});

	res.render(getView(err.status, req), {
		message: err.message, // @deprecated
		error: err
	});
};