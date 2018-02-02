"use strict";

const mongoose = require('mongoose');
const DBRef = mongoose.mongo.DBRef;

// noinspection JSUnusedGlobalSymbols
module.exports = {
	// para el video, es necesario haber ejecutado antes .loadFiles()
	getThumb: function(width, height, crop, enlarge){
		let src;
		
		['thumb', 'image', 'video'].some(function(k){
			if(this[k]){
				src = this[k];
				return true;
			}
		}, this);

		return src && src.getThumb(width, height, crop, enlarge);
	},
	// para el video, es necesario haber ejecutado antes .loadFiles()
	getImage: function(width, height, crop, enlarge){
		let src;

		['image', 'video'].some(function(k){
			if(this[k]){
				src = this[k];
				return true;
			}
		}, this);

		return src && src.getThumb(width, height, crop, enlarge);
	},
	// para el video, es necesario haber ejecutado antes .loadFiles()
	getSocialImage: function(){
		return this.socialImage && this.socialImage.getThumb() || this.getImage();
	},
	getSocialTitle: function(lang){
		let ret = this[this.schema.get('identifier') || 'title'];

		if(!ret)
			return;

		if(ret.getLang)
			ret = ret.getLang(lang);

		if(typeof ret !== 'string'){
			if(ret.toString)
				ret = ret.toString();
			else
				return;
		}

		return ret.truncate(58);
	},
	getSocialDescription: function(lang){
		let ret = this[this.schema.get('descIdentifier') || 'description'];

		if(!ret)
			return;

		if(ret.getLang)
			ret = ret.getLang(lang);

		if(typeof ret !== 'string'){
			if(ret.toString)
				ret = ret.toString();
			else
				return;
		}

		return ret.truncate(158);
	},
	hasChildren: function(){

		//TODO
		return Promise.resolve();
	},
	getChildren: function(filters, query, fields, options, cb) {
		if (typeof filters === 'function') {
			cb = filters;
			filters = [];
			query = {};
			options = {};
		} else if (typeof query === 'function') {
			cb = query;
			query = {};
			options = {};
		} else if (typeof fields === 'function') {
			cb = fields;
			fields = null;
			options = {};
		} else if (typeof options === 'function') {
			cb = options;
			if (typeof fields === 'string')
				options = {};
			else
				options = fields;
		} else if (!options)
			options = {};

		if (typeof cb === 'function')
			console.trace('@deprecated: do.getChildren() now returns Promise');

		return new Promise((ok, ko) => {
			this._getChildren(filters, query, fields, options, (err, children) => {
				err ? ko(err) : ok(children);
			});
		});
	},
	_getChildren: function(filters, query = {}, fields, options, cb) {
		const arr = {};
		const ret = {};

		if(!filters.length)
			filters = this.db.models.dynobject.schema.statics.getKeys();
		else {
			if(typeof filters === 'string')
				filters = [filters];

			filters.forEach(function(f,i){
				filters[i] = f.replace('dynobjects.', '');
			});
		}

		filters.forEach(function(f){
			arr[f] = [];
		});

		if(this.children){
			Object.values(this.children, v => {
				const ns = v.namespace.replace('dynobjects.', '');

				if(filters.indexOf(ns) !== -1)
					arr[ns].push(v.oid.toString());
			});
		}

		if(!Object.keys(arr).length)
			return cb(null, ret);

		const db = this.db.eucaDb;

		query['parents.$id'] = this._id;
		
		function cr(ns, ids, icb){
			db.model(ns).find(query, fields, options, function(err, r){
				if(err || !ids.length)
					return icb(err, r);

				if(arr[ns].length && !options.sort){
					//Ordena según los children definidos
					r.sort(function(a, b){
						return arr[ns].indexOf(a._id.toString()) - arr[ns].indexOf(b._id.toString());
					});
				}

				icb(null, r);
			});
		}

		Object.each(arr, (ns, ids) => {
			cr(ns, ids, function(err, r){
				if(err)
					return cb(err);

				ret[ns] = r;

				if(Object.keys(ret).length === Object.keys(arr).length)
					cb(null, ret);
			});
		});
	},
	removeParent: function(colname, parentId, cb){
		if(typeof parentId === 'string')
			parentId = new mongoose.Types.ObjectId(parentId);

		const thisId = this._id + '';
		const db = this.db;

		db.collections[colname].findOne({_id: parentId}, (err, parent) => {
			if(err)
				return cb(err);

			if(!parent)
				console.warn('Parent ' + parentId + ' not found');
			else {
				let childFound;
				const children = [];

				Object.values(parent.children, v => {
					if(v.oid + '' !== thisId)
						children.push(v);
					else
						childFound = true;
				});

				if(childFound){
					parent.children = children;

					db.collections[colname].update({id: parent._id}, {children: children}, function(err){
						err && console.warn(err);
					});
				} else
					console.warn('Child ' + thisId + ' not found in ' + colname + '.' + parentId);
			}

			let parentFound;
			const parents = [];

			this.parents && this.parents.forEach(parent => {
				if(parent.oid.equals(parentId))
					parentFound = true;
				else
					parents.push(parent);
			});

			if(parentFound){
				this.parents = parents;

				this.update({parents: parents}, {w: 1}, r => cb(err, r));
			} else
				cb(null, 0);
		});
	},
	addParent: function(colname, id, cb){
		if(typeof id === 'string')
			id = new mongoose.Types.ObjectId(id);

		//Avoid posible duplicates
		const parents = [];

		Object.values(this.parents, v => {
			if(!v.oid.equals(id))
				parents.push(v);
		});

		this.parents = parents;
		//end avoid

		this.parents.push(new DBRef(
			colname,
			id,
			this.db.name
		));

		//No manipula el padre porque hay un post save que si no está, lo añade
		this.update({parents: this.parents}, cb);
	},
	changeParent: function(colname, id, fromcolname, fromid, cb){
		console.log(arguments);
		cb(new Error('TODO changeParent'));
	},
	getNodeData: function(req, level, filter){
		const lang = req.ml.lang;

		let ret = {
			title: this.title && this.title[lang] || this.title,
			id: this.id,
			colname: this.schema.get('collection').replace('dynobjects.', '')
		};

		if(!level--)
			return this.hasChildren().then(() => {//temp dummy
				ret.hasChildren = true;
				return ret;
			});

		return this.getChildren(filter)
			.then(r => {
				if (!Object.keys(r).length)
					return ret;

				let count = 0;

				return new Promise(ok => {
					Object.values(r).forEach(rc => {
						let count2 = 0;

						if (!rc.length) {
							if (++count === Object.keys(r).length)
								ok(ret);
						} else {
							if (!ret.children)
								ret.children = [];

							rc.forEach(obj => {
								obj.getNodeData(req, level, filter).then(nd => {
									ret.children.push(nd);

									if (++count2 === rc.length && ++count === Object.keys(r).length)
										ok(ret);
								}).catch(console.trace.bind(console));
							});
						}
					});
				});
			});
	},
	commentsCount: function(cb){
		return this.db.models.comment.count({'ref.$id': this._id, active: true}, cb);
	},
	rate: function(req, rating){
		return req.ml.load('ecms-rating')
			.then(() => {
				if (req.session.rated && req.session.rated.some((rate, idx) => {
						if (this.id === rate.id) {
							if (new Date(rate.time).toDateString() === new Date().toDateString())
								return true;

							req.session.rated.splice(idx, 1);
						}
					})) {
					return {msg: req.ml.all._ALREADY_VOTED};
				}

				rating = parseInt(rating);

				if (!rating || rating > 5)
					throw new Error('Bad value');

				const rated = req.session.rated || [];

				rated.push({
					id: this._id,
					time: new Date()
				});

				req.session.rated = rated;

				if (!this.ratingCount) {
					this.rating = rating;
					this.ratingCount = 1;
				} else {
					let rCount = this.ratingCount++;
					// si hay mas de 10 valoraciones, estas contarán como 1/4 parte. jj - 16/07/15
					if (rCount > 10)
						rCount = 10 + Math.round(rCount / 4);

					this.rating = Math.round(((Math.min(this.rating, 5) * rCount + rating) / ++rCount) * 100) / 100;
				}

				return this.update({rating: this.rating, ratingCount: this.ratingCount})
					.then(() => req.db.rate.createNew(req, this, rating))
					.then(() => {
						return new Promise((ok, ko) => {
							req.session.save(err => {
								if (err)
									ko(err);
								else
									ok({status: 'ok', msg: req.ml.all._THANKS4RATING});
							});
						});
					});
			});
	},
	vote: function(req){
		return req.ml.load('ecms-rating')
			.then(() => {
				if (req.session.voted && req.session.voted.some((rate, idx) => {
						if (this.id === rate.id) {
							if (new Date(rate.time).toDateString() === new Date().toDateString())
								return true;

							req.session.voted.splice(idx, 1);
						}
					})) {
					return {msg: req.ml.all._ALREADY_VOTED};
				}

				const voted = req.session.voted || [];

				voted.push({
					id: this._id,
					time: new Date()
				});

				req.session.voted = voted;

				if (!this.ratingCount)
					this.ratingCount = 1;
				else
					this.ratingCount++;

				return this.update({ratingCount: this.ratingCount})
					.then(() => req.db.vote.log(req, this))
					.then(() => {
						return new Promise((ok, ko) => {
							req.session.save(err => {
								if (err)
									ko(err);
								else
									ok({status: 'ok', msg: req.ml.all._THANKS4RATING});
							});
						});
					});
			});
	},
	getLink: function (req){
		const host = req && req.headers ? 'http://' + req.headers.host : '';

		return host + '/' + (this.schema.get('baseurl') || this.schema) + '/' + this.id;
	},
	// retorna el nombre de una opción (selector, checkbox...) en el idioma actual
	getName: function(pathname, req, cb){
		if (typeof cb === 'function')
			console.trace('schema getVar is @deprecated');

		const schema = this.schema;
		const path = schema.tree[pathname];
		const o = path.options;
		const val = this.get(pathname);
		const lang = req.ml.lang;

		return new Promise((ok, ko) => {
			if (!path.multilang)
				return ok(val);

			if (!val || !o[val])
				return ok(val);

			if (o[val][lang])
				return ok(o[val][lang]);

			const toTranslate = o[val][req.ml.configLang];

			if (!toTranslate || !req.ml.translateAvailable())
				return ok(toTranslate);

			req.ml.translate(toTranslate, (err, result) => {
				if(err)
					return ko(err);

				if (!result)
					return ok(toTranslate);

				o[val][lang] = result;

				const query = {colname: schema.options.collection.replace('dynobjects.', '')};
				const update = {};

				update['dynvars.' + pathname + '.options.' + val + '.' + lang] = result;

				req.db.dynobject.update(query, update)
					.then(() => ok(result))
					.catch(ko);
			}, 'getName • ' + this.schema + ' • ' + pathname);
		});
	},
	changeVar: function(name, val){
		if(this.schema.tree[name].multilang && typeof val === 'object' && this.get(name)){
			const value = this.get(name);
			
			Object.each(val, (code, v) => {
				value[code] = v;
			});
			
			val = value;
			this.markModified(name);
		}
		
		const update = {};
	
		if(mongoose.Schema.Types.BdfList === this.schema.path(name).options.type){
			if(val.event === 'deleteFile'){
				const key = Object.keys(this.get(name))[val.val];
				
				update.$unset = {};
				update.$unset[name + '.' + key] = '';
			}
		} else {
			update.$set = {};
			update.$set[name] = val;
		}

		return this.update(update)
			.then(r => ({status: r.ok === 1, value: this.get(name)}));
	},
	globalLink: function(){
		return "/lmns/" + this.db.name + "." + this.schema + "/" + this.id;
	}
};
