"use strict";

module.exports = (req, res, next) => {
	const file = req.site.dir + '/bower_components/' + req.params[0] + '/dist/' + req.params[1];
	
	res.sendFile(file);
};