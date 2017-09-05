"use strict";

const methods = Object.assign({},
	require('./main'),
	require('./item'),
	require('./config')
);

module.exports = (req, res, next) => {
	const method = methods[req.params.method];

	if(!method)
		return next(404);

	return method(req, res)
		.then(r => res.json(r))
		.catch(next);
};