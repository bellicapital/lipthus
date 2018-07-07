"use strict";

// Google Page Speed Insights flag
module.exports = (req, res, next) => {
	if(req.query.gpsi !== undefined)
		res.locals.gpsi = req.query.gpsi != false;
	else if(req.site.config.detect_gpsi){
		const ua = req.get('user-agent');

		res.locals.gpsi = ua && ua.indexOf('Speed Insights') > 0;
	}

	next();
};