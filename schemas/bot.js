"use strict";

const res = [
	/compatible;\s(.+);.*(http[^)]+)/i,
	/^([^\s]+)\s*.*(http[^)\\]+)/i
];

module.exports = function bot(Schema){
	const s = new Schema({
		title: String,
		url: String,
		agents: [String],
		description: String
	}, {
		collection: 'bots'
	});

	s.statics = {
		fromAgent: function(agent){
			return this
				.findOne({agents : agent})
				.then(bot => {
					if(bot)
						return bot;

					let parsed = this.parseAgent(agent);

					return this.findOne({title: parsed.title})
						.then(bot => {
							if(bot){
								bot.agents.push(agent);

								return bot.save();
							}

							parsed.agents = [agent];

							return this.create(parsed);
						});
				});
		},

		parseAgent: agent => {
			agent = agent.replace(/Mozilla\/5.0\s*/, '');

			if(agent.indexOf('Applebot') !== -1)
				return {
					title: 'Applebot',
					url: 'http://www.apple.com/go/applebot'
				};

			if(agent.indexOf('LinkedInBot') !== -1)
				return {
					title: 'LinkedInBot',
					url: 'http://www.linkedin.com'
				};

			if(agent.indexOf('HaosouSpider') !== -1)
				return {
					title: 'HaosouSpider',
					url: 'http://www.haosou.com/help/help_3_2.html'
				};

			//Hackers using PyCurl to bypass registration???
			if(agent.indexOf('PycURL') !== -1)
				return {
					title: 'PycURL',
					url: 'https://www.google.es/search?q=PycURL+bot'
				};

			let ret;

			res.some(re => {
				let r = agent.match(re);

				if (r) {
					ret = {
						title: r[1],
						url: r[2]
					};

					return true;
				}
			});

			if(ret)
				return ret;

			if(agent.indexOf('360Spider') !== -1)
				return {
					title: '360Spider',
					url: 'http://so.360.cn/index.htm'
				};

			if(agent === 'facebookexternalhit/1.1')
				return {
					title: agent,
					url: 'http://www.facebook.com/externalhit_uatext.php'
				};

			if(agent.indexOf('CommonCrawler') !== -1)
				return {
					title: 'CommonCrawler',
					url: 'http://commoncrawl.org/'
				};

			return {
				title: agent.replace('Spider/5.1', '').trim()
			}
		}
	};

	return s;
};
