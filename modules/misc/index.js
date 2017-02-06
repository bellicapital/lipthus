/* global exports */

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function helocheck(req, res, next) {
	req.site.sendMail({
		to: 'helocheck@helocheck.abuseat.org',
		subject: 'helocheck',
		html: 'test'
	}, next);
}

// Functions which will be available to external callers
exports.helocheck = helocheck;
