"use strict";

module.exports = function formlog(Schema){
	const s = new Schema({
		tag: String,
		name: String,
		email: String,
		fields: {},
		embedded: {type: Schema.Types.BdfList, noWatermark: true},
		attachments: {type: Schema.Types.BdfList, noWatermark: true},
		iplocation: {}
	}, {
		collection: 'logger.forms',
		created: true
	});
	
	s.statics = {
		findByTag: function(tag, fields, options, cb){
			this.find({tag: tag}, fields, options, cb);
		},
		tagcount: function(cb){
			this.distinct('tag', cb);
		}
	};
	
	return s;
};