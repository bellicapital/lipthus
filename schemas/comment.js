"use strict";

const noti = require('../modules/notifier');
const mongoose = require('mongoose');
const DBRef = mongoose.mongo.DBRef;
const merge = require('merge-descriptors');
const ipLocation = require('../modules/geo').ipLocation;
const md5 = require('md5');


module.exports = function comment(Schema){
	const s = new Schema({
		active: {type: Boolean, index: true},
		refused: {type: Boolean, index: true},
		ref: DBRef.schema,
		name: String,
		email: String,//{type: String, validate: /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/},
		text: String,
		iplocation: {
//			ip: String,
//			area_code: String,
//			dma_code: String,
//			longitude: Number,
//			latitude: Number,
//			postal_code: String,
//			city: String,
//			region: String,
//			country_name: String,
//			country_code3: String,
//			country_code: String,
//			continent_code: String
		},
		url: String,
		lang: String,
		answers: [{
			active: Boolean,
			name: String,
			created: {type: Date, default: Date.now},
			submitter: {type: Schema.Types.ObjectId, ref: 'user'},
			text: String,
			iplocation: {}
		}],
		extra: Schema.Types.Mixed
	}, {
		collection: 'comments',
		submitter: true,
		lastMod: true,
		modifier: true,
		created: true
	});

	s.methods ={
		values4show: function(){
			const d = this.created || this._id.getTimestamp();

			return {
				id: this.id,
				created: d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear(),
				name: this.name,
				text: this.text,
				city: this.iplocation && this.iplocation.city,
				answers: this.answers
			};
		},
		getHash: function(){
			return md5(this.ref.oid.toString() + this.ref.namespace + this.text);
		},
		getItem: function(fields){
			if(!this.ref || !this.ref.namespace)
				return Promise.resolve();
			
			const dbs = this.db.eucaDb.site.dbs;
			const ref = this.ref.toObject();
		
			if(!ref.db)
				ref.db = this.db.eucaDb.site.db.name;

			if(!dbs[ref.db])
				return Promise.reject(new Error('db ' + ref.db + ' not found'));
			
			return dbs[ref.db].deReference(ref.toObject ? ref.toObject() : ref, fields);
		},
		approve: function(req, val, cb){
			if(!req.user)
				return cb(new Error('no user'));
			if(!req.User.isAdmin())
				return cb(new Error('you are nat an admin user'));

			this.set({active: val, modifier: req.User._id}).save(cb);
		},
		values4Edit: function(){
			const ret = this.jsonInfo();

			ret.created = this.created.toUserDatetimeString();
			ret.location = '';

			if(ret.iplocation){
				if(ret.iplocation.city)
					ret.location = ret.iplocation.city + ', ';

				ret.location += ret.iplocation.ip;
			}

			delete ret.iplocation;

			return ret;
		}
	};

	s.statics = {
		find4show: function(query, limit){
			if(typeof query === 'string')
				query = mongoose.Types.ObjectId(query);

			if(query instanceof mongoose.Types.ObjectId)
				query = {active: true, 'ref.$id' : query};

			const q = this
				.find(query)
				.sort({created: -1});

			if(limit)
				q.limit(limit);

			return q.then(comments => {
				comments.forEach((c, i) => comments[i] = c.values4show());

				return comments;
			});
		},
		submit: function(req, dbname, colname, itemid, uname, email, text){
			return req.ml
				.load('ecms-comment')
				.then(LC => {
					const config = req.site.config;

					if (!config.com_rule || (!config.com_anonpost && !req.user))
						return {error: LC._CM_APPROVE_ERROR};

					let active = config.com_rule === 1 || (req.user && (req.User.isAdmin() || config.com_rule < 3));

					const db = dbname ? req.site.dbs[dbname] : req.db;

					return db.comment
						.create({
							ref: new DBRef(colname, itemid, db.name).toObject(),
							name: uname ? uname : (req.user ? req.user.getName(true) : ""),
							email: email,
							text: text,
							iplocation: req.ipLocation,
							active: active,
							url: req.get('Referer'),
							lang: req.ml.lang,
							submitter: req.user && req.user._id
						})
						.then(comment => {
							if (req.user)
								req.User.subscribe2Item(comment.get('ref'));

							db.comment.emit('submit', comment, req);

							return comment.values4show();
						});
				});
		},
		countById: function(query){
			// no usar ES6 en mongo.mapReduce hasta mongo 3.2
			// comprobar javascriptEngine field in the output of db.serverBuildInfo() que sea SpiderMonkey y no V8.
			// de momento no usamos ES6. jj - 21/6/16
			const o = {
				map: function(){
					emit(this.ref.$id, 1);
				},
				reduce: function(k, v){
					var sum = 0;

					Object.keys(v).forEach(function (key) {
						sum += v[key];
					});

					return sum;
				},
				query: query
			};

			return this.mapReduce(o)
				.then(c => {
					const counts = {};

					Object.values(c).forEach(cc => counts[cc._id] = cc.value);

					return counts;
				});

		},
		colcount: function(cb){
			this.distinct('ref.$ref', (err, d) => {
				if(err)
					return cb(err);

				let count = 0;
		
				/*global ret*/
				const ret = {};

				d.forEach(r => {
					this.count({'ref.$ref': r}, (err, c) => {
						if(c)
							ret[r.replace('dynobjects.', '')] = c;

						if(++count === d.length){
							this.count({'ref.$ref': {$exists: false}}, (err, c) => {
								if(c)
									ret._ = c;

								cb(err, ret);
							});
						}
					});
				});
			});
		},
		colCountIncPending: function(cb){
			this.distinct('ref.$ref', (err, d) => {
				if(err)
					return cb(err);

				let count = 0;
				const ret = {};

				d.forEach(r => {
					if(!r)
						return;
					
					/* global query */
					let query = {'ref.$ref': r};
					const itemSchema = r.replace('dynobjects.', '');

					this.count(query, (err, c) => {
						query.active = {$ne: true};
						query.refused = {$ne: true};

						this.count(query, (err, c2) => {
							ret[itemSchema] = {total: c, pending: c2};

							if(++count === d.length){
								query = {'ref.$ref': null};//también muestra los vacios. jj 7/7/15

								this.count(query, (err, c) => {
									if(!c)
										return cb(err, ret);
									
									query.active = false;
									query.refused = {$ne: true};

									this.count(query, (err, c2) => {
										ret._ = {total: c, pending: c2};

										cb(err, ret);
									});
								});
							}
						});
					});
				});
			});
		},
		// mapReduce falla jj 4/2015
//		colcount: function(cb){
//			const ret = {},
//				o = {
//					map: function(){emit(this.ref && this.ref.$ref, 1);},
//					reduce: function(k, v){return v.length;}
//				};
//
//			this.mapReduce(o, function(err, r){
//				if(err)
//					return cb(err);
//
//				r && r.forEach(function(s){
//					ret[s._id && s._id.replace('dynobjects.', '')] = s.value;
//				});
//
//				cb(err, ret);
//			});
//		},
		googleVisualizationList: function(req, colname, limit, skip){
			return req.ml.load('ecms-comment').then(lc => {
				const ret = {
					cols: [
						{'label': lc._NAME, 'type': 'string'},
						{'label': lc._CM_TEXT, 'type': 'string'},
						{'label': lc._DATE, 'type': 'string'},
						{'label': "", 'type': 'string'},
						{'label': lc._ACTIVE, 'type': 'boolean'},
						{'label': '', 'type': 'string'}
					],
					rows: []
				};

				return new Promise((ok, ko) => {
					this.byColnameIncItemTitle(colname, {}, {
						sort: {_id: -1},
						limit: limit,
						skip: skip
					}, (err, comments) => {
						if (err)
							return ko(err);

						comments.forEach(comment => {
							ret.rows.push({
								p: {id: comment.id},
								c: [
									{v: comment.name},
									{v: comment.text.truncate()},
									{v: comment.created.toUserDateString('es', '-')},
									{v: comment.itemTitle},
									{v: !!comment.active},
									{v: '<div id="' + comment.id + '" style="width: 18px;" class="ui-button ui-state-default ui-corner-all deleteComment"><span class="ui-icon ui-icon-trash"></span></div>'}
								]
							});
						});

						ok(ret);
					});
				});
			});
		},
		byColname: function(colname, query, options, cb){
			if(typeof(options) === 'function'){
				cb = options;
				options = {};
			}
			
			query['ref.$ref'] = colname ? 'dynobjects.' + colname : null;
			
			this.count(query, (err, count) => {
				if(err)
					return cb(err);
				
				if(!count)
					return cb(null, [], 0);
				
				const q = this.find(query);

				Object.each(options, (o, v) => {
					q[o](v);
				});
				
				q.populate('modifier', 'uname').exec((err, comments) => {
					return cb(err, comments, count);
				});
			});
		},
		byColnameIncItemTitle: function(colname, query, options, cb){
			this.byColname(colname, query, options, (err, comments, total) => {
				if(err || !comments.length)
					return cb(err, comments, total);
					
				const promises = comments.map((comment,idx) => {
					return comment.getItem({title: 1})
						.then(item => {
							const obj = comment.toObject();
							obj.id = obj._id.toString();

							obj.item = item ? {
								id: item.id,
								title: item.title,
								schema: item.schema,
								link: item.getLink()
							} : {}; // no mandamos undefined para evitar errores con items eliminados

							obj.iplocation = ipLocation(obj.iplocation);

							comments[idx] = obj;
						});
				});

				Promise.all(promises).then(r => cb(null, comments, total), cb);
			});
		}
	};

	return s;
};