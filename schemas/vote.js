"use strict";

const DBRef = require('mongoose').mongo.DBRef;


module.exports = function vote(Schema){
	const s = new Schema({
		item: DBRef.schema,
		iplocation: {},
		device: {}
	}, {
		collection: 'votes',
		created: true,
		submitter: true
	});
	
	s.index({'item.$ref': 1});
	s.index({'item.$id': 1});
	
	s.statics = {
		log: function(req, item){
			return this.create({
				item: item.getDBRef().toObject(),
				iplocation: req.ipLocation,
				device: req.device,
				submitter: req.user
			});
		}
	};
	
	return s;
};