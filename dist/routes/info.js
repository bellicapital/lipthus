"use strict";

const methods = {
	langnames: req => req.ml.availableLangNames()
};

module.exports = function(req, res){
	const method = methods[req.params.method];
	
	if(!method)
		return res.send({error: 'Method not found'});
	
	method(req).then(r => res.send(r));
};