"use strict";

const main = require('./main');

module.exports = (req, res, next) => {
	const method = main[req.params.method];

	if(!method)
		return next(404);

	return method(req, res)
		.then(r => res.json(r))
		.catch(next);
};