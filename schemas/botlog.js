"use strict";

module.exports = function botlog(Schema){
	const s = new Schema({
		url: String,
		referer: String,
		bot: {type: Schema.Types.ObjectId, ref: 'bot'}
	}, {
		collection: 'logger.bot',
		identifier: 'bot',
		created: true
	});

	s.statics = {
		countList: function(query){
			return this.distinctCount('bot', query);
		},

		log: function(req){
			return this.db.lipthusDb.bot
				.fromAgent(req.get('user-agent'))
				.then(bot => {
					return this.create({
						url: req.protocol + '://' + req.get('host') + req.originalUrl,
						referer: req.get('referer'),
						bot: bot
					});
				});
		}
	};

	return s;
};
