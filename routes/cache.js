const Bdf = require('../modules/bdf');
const ObjectId = require('mongoose').Types.ObjectId;

module.exports = function(req, res, next){
	if(!ObjectId.isValid(req.params.id))
		return next();
	
	req.db.cache.findById(req.params.id, function(err, file){
		if(err)
			return next(err);
		
		if(!file)
			return next();

		Bdf.fromMongo(file).send(req, res);
	});
};