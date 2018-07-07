"use strict";

module.exports = function translatorCache(Schema){
	const s = new Schema({
		src: {type: String, index: true, unique: true},
		from: String,
		values: {}
	}, {
		collection: 'cache.translator'
	});
	
	s.index({
		src: 1,
		from: 1
	}, {
		unique: true
	});
	
	s.statics = {
		get: function(src, from, to, cb){
			const isString = typeof src === 'string';
			const query = {from: from};
			let count = 0;
			let lastErr;
			const ret = [];
			
			if(isString)
				src = [src];
			
			query['values.' + to] = {$exists: true};
			
			src.forEach(function(s, idx){
				query.src = s;
				
				this.findOne(query, 'values.' + to, function(err, r){
					if(err)
						lastErr = err;
					
					ret[idx] = r && r.values[to];
					
					if(++count === src.length)
						cb(lastErr, isString ? ret[0] : ret);
				});
			}, this);
		},
		set: function(src, from, to, value, cb){
			const update = {};
			
			update["values." + to] = value;
			
			this.update({from: from, src: src}, {$set: update}, {upsert: true}, function(err,r){
				return cb && cb(err,r);
			});
		}
	};
	
	return s;
};