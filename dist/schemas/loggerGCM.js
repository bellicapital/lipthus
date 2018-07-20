"use strict";

module.exports = function loggerGCM(Schema){
	return new Schema({
		data: {},
		ids: [String],
		response: {}
	}, {
		collection: 'logger.gcm'
	});
};