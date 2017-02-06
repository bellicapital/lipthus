"use strict";


module.exports = function uri(Schema){
	const s = new Schema({
		uri: String,
		title: Schema.Types.Multilang,
		description: Schema.Types.Multilang,
		h1: Schema.Types.Multilang,
		p: Schema.Types.Multilang
	}, {
		collection: 'uris',
		created: true,
		modifier: true,
		submitter: true,
		lastMod: true
	});

	s.index({uri: 1, type: 1});
	
	s.statics.getByUri = function(req, uri, replacers, cb){
		this.findOne({uri: uri}, function(err, uri){
			if(err || !uri)
				return cb(err);

			let count = 0;
			let error;
			let params = {};

			let frDone = () => {
				if(++count === 4)
					cb(error, params, uri);
			};

			['title', 'description', 'h1', 'p'].forEach(k => {
				if(!uri[k])
					return frDone();

				uri[k].getLangOrTranslate(req.ml.lang)
					.then(r => {
						if(r){
							replacers.forEach(rep => r = r.replace(rep[0], rep[1]));

							params[k] = r;
						}

						frDone();
					})
					.catch(err => error = err);
			});
		});
	};
	
	return s;
};