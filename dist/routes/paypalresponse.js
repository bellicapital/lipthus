"use strict";

const fs = require('mz/fs');

module.exports = function PaypalResponse(req, res, next){
	const post = req.body;

	if(!post.test){
		const log = JSON.stringify({
			date: new Date(),
			post: post,
			ip: req.ip
		}, null, '\t');

		fs.writeFile(req.site.dir + '/paypalresponse_log.json', log)
			.catch(console.error.bind(console));
	}
};