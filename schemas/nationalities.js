"use strict";

let cache = {};

module.exports = function nationalities(Schema){
	const s = new Schema({
		code: String,
		title: Schema.Types.Multilang
	}, {
		collection: 'nationalities'
	});

	s.statics.getList = function(req, lang){
		if (!lang)
			lang = req.ml.lang;

		const end = () => {
			if(lang === req.ml.lang && !req.nationalities)
				Object.defineProperty(req, 'nationalities', {value: cache[lang]});
			
			return cache[lang];
		};
		
		if(cache[lang])
			return Promise.resolve(end());
		
		return this.getLangList(lang)
			.then(list => {
				cache[lang] = list;

				return end();
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
	
	s.statics.setVal = function(code, lang, value) {
		const update = {$set: {}};
		
		update.$set["title." + lang] = value;
		
		return this.updateNative({code: code}, update, {upsert: true})
			.then(r => {
				if (!r.result || !(r.result.nModified || r.result.upserted))
					return false;
				
				cache = {};
				
				return true;
			});
	};

	return s;
};