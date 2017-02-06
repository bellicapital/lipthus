"use strict";

module.exports = function cacheResponse(Schema){
	const s = new Schema({
		uri: String,
		device: {type: String, index: true},
		lang: {type: String, index: true},
		expires: Date,
		contentType: String,
		MongoBinData: Buffer
	}, {
		collection: 'cache.response',
		created: true,
		lastMod: true
	});
	
	s.index({
		uri: 1,
		device: 1,
		lang: 1
	}, {
		unique: true
	});

	s.statics = {
		clear: function(){
			return new Promise((ok, ko) => {
				this.db.collection(this.schema.options.collection).drop(err => {
					err && err.message != 'ns not found' ? ko(err) : ok();
				});
			});
		}
	};

	return s;
};