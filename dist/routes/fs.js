"use strict";

exports.fs = function(req, res){
	req.site.db.fs.get(req.params.id).send(req, res);
};