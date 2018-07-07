"use strict";

module.exports = function loggerSubscription(Schema){
	const s = new Schema({
		email: String,
		event: String,
		lang: String,
		to: {}
	}, {
		collection: 'logger.subscriptions',
		versionKey: false,
		created: true
	});
	
	s.statics = {
		log: function(event, email, to, lang){
			return this.create({
				event: event,
				email: email,
				to: to,
				lang: lang
			});
		},
		summary: function(query){
			const now = new Date();
			const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
			let lastMonth = new Date(thisMonth.getTime());
			lastMonth.setMonth(thisMonth.getMonth() - 1);
			const ret = {};

			return this.count(query)
				.then(total => {
					ret.total = total;
					query.created = {$gt: thisMonth};
				})
				.then(() => this.distinct('email', query))
				.then(curMonth => {
					ret.curMonth = curMonth.length;
					query.created = {
						$lt: thisMonth,
						$gt: lastMonth
					};
				})
				.then(() => this.distinct('email', query))
				.then(lastMonth => ret.lastMonth = lastMonth.length)
				.then(() => ret);
		}
	};
	
	return s;
};
