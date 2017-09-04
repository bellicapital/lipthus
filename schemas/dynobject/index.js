"use strict";

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
			const ret = {};

			return this.find()
				.then(obj => ret.handlers = obj.map(o => o.getDynValues(req)))
				.then(() => req.site.db.dynobjectsmenu.find())
				.then(m => {
					ret.menus = m.map(menu => {
						const json = menu.jsonInfo();
                        delete json.__v;

                        return json;
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
		getNodeTree: function(req, filter, levels, incOrphans){
			filter = filter || [];
			levels = levels || 1;
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

			return Promise.all(
				models.map(colname => {
					let opt = {sort: {}};

					if (!req.db.schemas[colname].tree.title.multilang)
						opt.sort.title = 1;
					else
						opt.sort['title.' + req.ml.lang] = 1;

					return req.db[colname].find(query, '', opt)
						.then(r => Promise.all(r.map(obj => obj.getNodeData(req, levels, filter).then(nData => ret.push(nData)))))
						.then(() => ret);
				})
			);
		}
	};
	
	return s;
};