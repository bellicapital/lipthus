/* global module */

"use strict";

module.exports = function (req, res, next){
	res.locals.counts = {};

	const counts = {};

	const lastHour = new Date();
	lastHour.setHours(lastHour.getHours() - 1);
	const lastDay = new Date();
	lastDay.setDate(lastDay.getDate() - 1);
	const lastMonth = new Date();
	lastMonth.setMonth(lastMonth.getMonth() - 1);

	res.htmlPage
		.init('admin/bots-log')
		.then(() => req.db.botlog.countList({created: {$gt: lastHour}}))
		.then(r => counts.lastHour = r)
		.then(() => req.db.botlog.countList({created: {$gt: lastDay}}))
		.then(r => counts.lastDay = r)
		.then(() => req.db.botlog.countList({created: {$gt: lastMonth}}))
		.then(r => counts.lastMonth = r)
		.then(() => {
			res.locals.bots = {};

			const periods = res.locals.periods = ['lastHour', 'lastDay', 'lastMonth'];

			return req.db.bot.find()
				.select('url title')
				.then(rBots => {
					const bots = {};

					rBots.forEach(bot => {
						const botCounts = {};

						periods.forEach(k => {
							if (counts[k][bot.id])
								botCounts[k] = counts[k][bot.id];
						});

						if (!Object.keys(botCounts).length)
							return;

						bots[bot.id] = {
							title: bot.title,
							url: bot.url,
							counts: botCounts
						}
					});

					res.locals.bots = [];

					Object.each(bots, (id, b) => {
						b.id = id;

						res.locals.bots.push(b);
					});

					res.locals.bots.sort((a, b) => {
						return b.counts.lastMonth - a.counts.lastMonth;
					});
				});
		})
		.then(res.htmlPage.send.bind(res.htmlPage))
		.catch(next);
};