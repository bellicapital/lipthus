"use strict";

const $ = require('../../modules/utils');
const DoSchema = require('./do');
const _ = require('underscore');


module.exports = function dynobject(Schema){
	const s = new Schema({
		title: {type: Schema.Types.Multilang, caption: '_TITLE'},
		description: {type: Schema.Types.Multilang, formtype: 'textarea', caption: '_DESCRIPTION'},
		name: String,
		colname: String,
		tag: String, //blog, category, product, ...
		dynvars: {},
		identifier: {type: String, default: 'title'},
		descIdentifier: {type: String, default: 'description'},
		parents: {},
		accept: [],
		active: {type: Boolean, default: true, caption: '_ACTIVE'},
		image: {type: {}, caption: '_IMAGE'},
		baseurl: String,
		list_created: {type: Boolean, default: true},
		subscriptions: Boolean,
		rss: Boolean,
		showTranslate: Boolean,
		required_or: {},
		logUpdates: {},
		lang: {newItem: {}},//traducciones relacionadas con el objeto
		list_order: {type: {}, default: {title: 1}}  //Ordenación predeterminada para los listados. Formato pe: {created: -1}
	}, {
		collection: 'dynobjects'
	});

	s.statics = {
		getSchemas: function(){
			return this.find()
				.then(objs => {
					const schemas = {};

					s.set('schemas', schemas);

					objs.forEach(DoSchema.fromModel, schemas);

					return schemas;
				});
		},
		getKeys: function(){
			return Object.keys(s.get('schemas'));
		},
		schemas: function(){
			return s.get('schemas');
		},
		taggedKeys: function(tag){
			const ret = [];
			const schemas = s.get('schemas');

			for(let k of Object.keys(schemas)){
				if(schemas[k].options.tag === tag)
					ret.push(k);
			}
			return ret;
		},
		getItemsArray: function(req){
			const ret = {handlers: {}, menus: {}};

			return this.find()
				.then(obj => obj.forEach(o => ret.handlers[o.colname] = o.getDynValues(req)))
				.then(() => req.site.db.dynobjectsmenu.find())
				.then(m => {
					ret.menus = {};

					m.forEach(menu => {
						const json = menu.jsonInfo();

						ret.menus[json._id] = json;

                        delete json._id;
                        delete json.__v;
					});

					return ret;
				});
		},
		checkAll: function(req, cb){
			const ret = {dynobjects: {}};

			this.find((err, dy) => {
				let count = 0;

				dy.forEach(d => {
					req.db[d.colname].checkAll(req, function(err, r){
						ret.dynobjects[d.colname] = r;

						if(++count === dy.length)
							cb(null, ret);
					});
				});
			});
		},
		createLMN: function(key, tpl){
			return Promise.resolve('to do')
		}
	};
	
	s.methods = {
		getDynValues: function(req){
			const ret = this.toObject();

			ret.id = ret._id;
			delete ret._id;
			delete ret.dynvars;

			ret.vars = req.db[ret.colname].getDefinitions();

			return ret;
		},
		getNodeTree: function(req, format, filter, levels, state, incOrphans){
			format = format || 'jstree';
			filter = filter || [];
			levels = levels || 1;
			state = state || 'closed';
			incOrphans = incOrphans === undefined ? true : incOrphans;

			if(!filter)
				filter = [];
			else if(typeof filter === 'string')
				filter = filter.split(',');

			let models;
			const ret = [];

			if(incOrphans && this.accept.length){
				models = this.accept.slice(0);//clone

				if(models.indexOf(this.colname) === -1)
					models.unshift(this.colname);
			} else
				models = [this.colname];

			if(filter.length)
				models = _.difference(models, filter);

			const query = {
				parents: {
					$not: {
						$elemMatch: {
							$ref: 'dynobjects.' + this.colname
						}
					}
				}
			};

			let done = 0;

			return new Promise((ok, ko) => {
				models.forEach(colname => {
					let opt = {sort: {}};

					if (!req.db.schemas[colname].tree.title.multilang)
						opt.sort.title = 1;
					else
						opt.sort['title.' + req.ml.lang] = 1;

					req.db[colname].find(query, '', opt, (err, r) => {
						if (err) return ko(err);

						switch (format) {
							case 'jstree':
								if (!r.length && ++done === models.length)
									ok(ret);

								let count = 0;

								r.forEach(obj => {
									obj.getNodeData(req, state, levels, filter).then(nData => {
										ret.push(nData);
										//								l(count, r.length , done , models.length)
										if (++count === r.length && ++done === models.length)
											ok(ret);
									}).catch(ko);
								});
						}
					});
				});
			});
		}
	};
	
	return s;
};