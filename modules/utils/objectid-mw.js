"use strict";

const ObjectId = require('mongoose').Types.ObjectId;

class CastErr404 extends Error{
	constructor(v){
		super('ObjectId ' + v + ' is not valid');

		this.status = 404;
	}
}

CastErr404.code = 404;

module.exports = function objectIdMw(req, res, next) {
	const id = req.params.id || req.query.id;

	return next (ObjectId.isValid(id) ? null : new CastErr404(id));
};