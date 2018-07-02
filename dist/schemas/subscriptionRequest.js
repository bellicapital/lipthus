
module.exports = function subscriptionRequest(Schema){
	return new Schema({
		email: {type: String, index: 1},
		lang: String,
		subscriptions: {},
		url: String,
		confirmed: Boolean
	}, {collection: 'subscriptions.requests'});
};