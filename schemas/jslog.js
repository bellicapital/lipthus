module.exports = function jslog(Schema){
	const s = new Schema({
		errorMsg: String,
		url: String,
		lineNumber: Number,
		column: Number,
		context: String
	}, {
		collection: 'logger.clientjs',
		capped: {size: 4096, max: 100},
		versionKey: false,
		created: true,
		submitter: true
	});
	
	s.statics = {
		logError: function(errorMsg, url, lineNumber, column, context, cb){
			this.create({
				errorMsg: errorMsg,
				url: url,
				lineNumber: lineNumber,
				column: column,
				context: context
			}, cb);
		}
	};
	
	return s;
};