"use strict";

module.exports = function (req, res, next){
	res.htmlPage
		.init('admin/bot')
		.then(() => req.db.bot.findById(req.params.id))
		.then(bot => res.locals.bot = bot)
		.then(bot => req.db.botlog
			.find({bot: bot._id})
			.sort({created: -1})
			.limit(200)
		)
		.then(logs => res.locals.botlogs = logs)
		.then(res.htmlPage.send.bind(res.htmlPage))
		.catch(next);
};