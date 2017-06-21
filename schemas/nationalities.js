"use strict";

const cache = {};

module.exports = function nationalities(Schema){
	const s = new Schema({
		code: String,
		title: Schema.Types.Multilang
	}, {
		collection: 'nationalities'
	});

	s.statics.getList = function(req){
		const lang = req.ml.lang;

		if(cache[lang] && !req.nationalities)
			req.nationalities = cache[lang];

		if(req.nationalities)
			return Promise.resolve(req.nationalities);

		return this.getLangList(req.ml.lang)
			.then(list => {
				if(!req.nationalities) {
					Object.defineProperty(req, 'nationalities', {value: list});
					cache[req.ml.lang] = list;
				}

				return list;
			});
	};

	s.statics.getLangList = function(lang){
		const sort = {};
		const list = {};

		sort['title.' + lang] = 1;

		return this.find()
			.sort(sort)
			.then(r => r.map(t => t.title
				.getLangOrTranslate(lang)
				.then(name => list[t.code] = name)
			))
			.then(p => Promise.all(p))
			.then(() => list);
	};

	return s;
};