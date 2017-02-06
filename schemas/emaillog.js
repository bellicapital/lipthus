

module.exports = function emaillog(Schema){
	return new Schema({
		email: {},
		error: {},
		result: {}
	}, {
		collection: 'logger.mailsent',
		identifier: 'to',
		created: true
	});
};