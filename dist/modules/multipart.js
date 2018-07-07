"use strict";

const os = require('os');
const multipart = require('multer')({ dest: os.tmpdir() }).any();

module.exports = (req, res, next) => {
	req.multipart = () => new Promise((ok, ko) => multipart(req, res, (err, r) => {
		if(err)
			ko(err);
		else
			ok(r);
	}));

	next();
};