"use strict";

module.exports = function search(Schema){
	const s = new Schema({
		query: String
	}, {
		collection: 'searches',
		created: true,
		location: true
	});
	
	
	s.statics = {
		log: function(req, query, cb){
			if(!cb && typeof query === 'function'){
				return query(new Error('Saving an empty query'));
			}
			
			this.create({
				query: query,
				location: req.ipLocation
			}, cb);
		}
	};
	
	return s;
};