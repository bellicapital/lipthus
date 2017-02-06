"use strict";

module.exports = function cache(Schema){
	const s = new Schema({
		name: {type: String, index: true},
		expires: Date,
		contentType: String,
		tag: String,
		mtime: Date,
		MongoBinData: Buffer,
		source: {type: String, index: true},
//		md5: String,
		srcmd5: String,
		ref: {},
		width: Number,
		height: Number,
		crop: Boolean,
		size: Number,
		wm: Boolean
	}, {
		created: true,
		lastMod: true
	});
	
	s.pre('save', function(next){
		if(!this.expires){
			const expires = new Date();
			this.expires = expires.setDate(expires.getDate() + 30);
		}
		next();
	});
	
	return s;
};