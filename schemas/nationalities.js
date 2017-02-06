"use strict";

const cache = {};

module.exports = function nationalities(Schema){
	const s = new Schema({
		code: String,
		title: Schema.Types.Multilang
	}, {
		collection: 'nationalities'
	});

	s.statics.getList = function(req, cb){
		if(cb)
			console.trace('getList cb is @deprecated. Use Promise');

		const lang = req.ml.lang;

		if(cache[lang] && !req.nationalities)
			req.nationalities = cache[lang];

		if(req.nationalities)
			return cb ? cb(req.nationalities) : Promise.resolve(req.nationalities);

		return this.getLangList(req)
			.then(list => {
				if(!req.nationalities) {
					Object.defineProperty(req, 'nationalities', {value: list});
					cache[req.ml.lang] = list;
				}

				cb && cb(list);

				return list;
			});
	};

	s.statics.getLangList = function(req, cb){
		const sort = {};
		const list = {};

		sort['title.' + req.ml.lang] = 1;

		return this.find()
			.sort(sort)
			.then(r => r.map(t => t.title
				.getLangOrTranslate(req.ml.lang)
				.then(name => list[t.code] = name)
			))
			.then(p => Promise.all(p))
			.then(() => list);
	};

	return s;
};