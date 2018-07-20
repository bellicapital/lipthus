"use strict";

const wordCount = require('html-word-count');

module.exports = function translated(Schema){
	const s = new Schema({
		from: String,
		to: {type: String, required: true},
		dbname: {type: String, required: true},
		colname: {type: String, required: true},
		itemid: {type: Schema.Types.ObjectId, required: true},
		field: {type: String, required: true},
		uid: {type: Schema.Types.ObjectId, required: true, ref: 'user'},
		words: Number,
		submitter: {type: Schema.Types.ObjectId, ref: 'user'},
		modifier: {type: Schema.Types.ObjectId, ref: 'user'}
	}, {
		collection: 'translated',
		created: true,
		modified: true
	});

	s.index({col: 1, itemid: 1, field: 1, to: 1}, {unique: true, dropDups: true});

	s.statics = {
		getFields: function(id, lang){
			return this.find({itemid: id, to: lang}, 'field')
				.then(result =>{
					const ret = [];

					result.forEach(r => ret.push(r.field));

					return ret;
				});
		},
		getFieldCountById: function(query, cb){
			if(typeof query === 'string')
				query = {to: query};

			this.find(query, function(err, r){
				if(err)
					return cb(err);

				const ret = {};

				r.forEach(function(t){
					const k = t.dbname + '.' + t.colname;

					if(!ret[k])
						ret[k] = {};

					if(!ret[k][t.itemid])
						ret[k][t.itemid] = 0;

					++ret[k][t.itemid];
				});

				cb(null, ret);
			});
		},
		getFullTree: function(lang, cb){
			this.find({to: lang}, function(err, r){
				if(err)
					return cb(err);

				const ret = {};

				r.forEach(function(t){
					const k = t.dbname + '.' + t.colname;

					if(!ret[k])
						ret[k] = {};

					if(!ret[k][t.itemid])
						ret[k][t.itemid] = {};

					ret[k][t.itemid][t.field] = true;
				});

				cb(null, ret);
			});
		},
		switch: function(query, uid, translated){
			if(!translated)
				return this.remove(query).then(r => !!r);

		// Marcar como traducido. Hemos de contar las palabras
			const site = this.db.eucaDb.site;

			return new Promise((ok, ko) => {

				const finish = () => {
					const update = query;
					update.uid = uid;

					if(!update.from)
						update.from = site.config.language;

					query = {
						itemid: update.itemid,
						field: update.field,
						to: update.to
					};

					this.findOneAndUpdate(query, update, {upsert: true}).then(r => ok(!!r)).catch(ko);
				};

				site.dbs[query.dbname][query.colname]
					.findOneField(query.itemid, query.field + '.' + site.config.language)
					.then(srctext => {
						// cuenta las palabras del idioma original
						query.words = wordCount(srctext);

						finish();
					})
					.catch(finish);
			});
		},
		wordsByMonth: function(query){
			return this.find(query, 'created words to').then(r => {
				const ret = {};

				r.forEach(function(t){
					const year = t.created.getFullYear();
					const month = t.created.getMonth();
					const key = year + '-' + month;

					if(!ret[key])
						ret[key] = {
							month: month,
							key: key,
							langs: {}
						};

					if(!ret[key].langs[t.to])
						ret[key].langs[t.to] = t.words;
					else
						ret[key].langs[t.to] += t.words;
				});

				const ret2 = Object.values(ret);

				ret2.sort(function(a, b){
					return a.key < b.key ? -1 : 1;
				});

				return ret2;
			});
		},
		//solucion temporar para actualizar con contadores de palabras
		setWC: function(){
			const site = this.db.eucaDb.site;

			this.find(function(err, r){
				if(err)
					return cb(err);

				const cache = {};

				r.forEach(t => {
					const field = t.field + '.' + site.config.language;
					const key = t.itemid + '.' + field;

					if(typeof cache[key] === 'number')
						return t.set('words', cache[key]).save();

					site.dbs[t.dbname][t.colname]
						.findOneField(t.itemid, t.field + '.' + site.config.language)
						.then(srctext => {
							cache[key] = srctext ? srctext.replace(/[.,?!;()"'-]/g, " ").replace(/\s+/g, " ").split(" ").length : 0;
							t.set('words', cache[key]).save();
						});
				});
			});
		}
	};


	return s;
};
