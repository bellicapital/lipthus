"use strict";

const main_ = require('./main');
const item_ = require('./item');
const methods = Object.assign({}, main_, item_);

module.exports = (req, res, next) => {
	const method = methods[req.params.method];

	if(!method)
		return next(404);

	return method(req, res)
		.then(r => res.json(r))
		.catch(next);
};