"use strict";

const mongoose = require('mongoose');

module.exports = function(schema){
	schema.statics.findOneField = function(id, fieldName, cb){
		let ns = fieldName.split('.');
		let last = ns.length - 1;
		let lastIsArray = /^\d+$/.test(ns[last]);
		let projection = fieldName;

		if(lastIsArray)
			projection = projection.match(/^(.+)\.\d+$/)[1];

		return this.findById(id, projection).then(obj => {
			if(obj){
				let str = 'obj = obj';

				ns.forEach((v) => {
					str += '[';

					if(/^\d+$/.test(v))
						str += parseInt(v, 10) + ']';
					else
						str += '"' + v + '"]';
				});

				eval(str);
			}

			if(cb)
				cb(err, obj);
			else
				return obj;
		});
	};

	schema.statics.iFind = function(query, cb){
		if('function' === typeof query){
			cb = query;
			query = {};
		} else
			query = query || {};

		if(this.schema.paths.active)
			query.active = true;

		return this.find(query, null, {sort: {top: -1, _weight: 1}}, cb);
	};

	schema.statics.updateNative = function(){
		const col = this.db.collection(this.schema.options.collection);
		const keys = Object.keys(arguments[1].$set || arguments[1].$unset);

		['modified', 'modifier'].forEach(function(k){
			const mod = keys.indexOf(k);

			if(mod > -1)
				keys.splice(mod, 1);
		});

		const ret = col.update.apply(col, arguments);

		//evento
		this.find(arguments[0], function(err, docs){
			if(err || !docs || !docs.length)
				return;

			docs.forEach(function(doc){
				doc.emit('update', keys);
			});
		});

		return ret;
	};

	schema.statics.updateByIdNative = function(id){
		arguments[0] = {_id: mongoose.Types.ObjectId(id)};

		return this.updateNative.apply(this, arguments);
	};

// No tiene sentido. A deprecar. Mongoose Model.findOneAndUpdate es eso
	schema.statics.findAndModify = function(){
		const col = this.db.collection(this.schema.options.collection);

		return col.findAndModify.apply(col, arguments);
	};

	/**
	 * Usado para simplificar los comandos desde ajax
	 */
	schema.statics.findOneAndUpdateSafe = function(){
		const update = arguments[1];
		const cb = arguments[arguments.length - 1] || function () {};

		this.findOne(arguments[0], function(err, doc){
			if(err) return cb(err);

			if(!doc) return cb(err);

			doc.set(update);

			//6/5/14 No funciona con objetos. tmp solution
			Object.each(update, (i, u) => {
				if(doc.get(i) !== u){
					const parts = i.split('.');

					if(parts.length === 2){
						const base = parts[0];
						const val = doc.get(base);

						val[parts[1]] = u;

						doc.set(base, val);
					} else
						doc.set(i, u);
				}
			});

			doc
				.save()
				.then(doc => cb(nul, doc && doc.jsonInfo()))
				.catch(cb);
		});
	};

	/**
	 * Usado para simplificar los comandos desde ajax
	 */
	schema.statics.findByIdAndUpdateSafe = function(){
		arguments[0] = {_id: arguments[0]};

		return this.findOneAndUpdateSafe.apply(this, arguments);
	};

	/**
	 *
	 * @param {type} id
	 * @param {type} key
	 * @param {type} value
	 * @param {function} cb
	 * @returns {Promise}
	 */
	schema.statics.updateItemField = function(id, key, value, cb){
		const update = {};
		update[key] = value;

		return this.update({_id: id}, update, function(err, numberAffected){
			cb(err, {status: !!numberAffected});
		});
	};

	schema.statics.getDefinition = function(k){
		const o = this.schema.tree[k];
		const ret = {
			caption: o.caption,
			formtype: o.formtype,
			required: o.required,
			list: o.list,
			type: o.origType,
			value: o.default,
			options: o.options
		};

		switch(this.schema.getTypename(k)){
			case 'Multilang':
				ret.multilang = true;
				break;
			case 'Bdf':
			case 'BdfList':
			case 'Fs':
			case 'Date':
			default:
		}

		//noinspection FallThroughInSwitchStatementJS
		switch(o.origType){
			case 'textarea':
				ret.rows = o.rows;
				ret.cols = o.cols;
			case 'text':
				ret.translatable = o.translatable || undefined;
				ret.size = o.size || 64;
				ret.formtype = o.origType;
				break;
			case 'email':
			case 'url':
				ret.formtype = 'text';
				ret.size = 64;
				break;
			case 'selector':
				ret.formtype = o.formtype || 'selector';
				break;
			case 'bolean':
			case 'boolean':
				ret.formtype = 'yesno';
				break;
			case 'file':
			case 'image':
			case 'video':
			case 'audio':
				ret.multi = o.multi || 0;
				ret.formtype = o.origType;
				break;
			case 'money':
				ret.formtype = 'number';
		}

		return ret;
	};

	schema.statics.getDefinitions = function(){
		const common = [
			'children', 'parents', '_id', '__v', 'created', 'modified', 'submitter',
			'modifier', 'rating', 'ratingCount', 'lastActivated', 'removed'
		];

		let ret = {};

		this.schema.eachPath(k => {
			if(common.indexOf(k) === -1)
				ret[k] = this.getDefinition(k);
		});
		
		return ret;
	};

	if(!schema.statics.getList)
		schema.statics.getList = function(query, cb){
			if(!cb && typeof query === 'function'){
				cb = query;
				query = {};
			}

			const identifier = this.schema.options.identifier || 'title';

			return this
				.find(query, identifier)
				.then(list => {
					const ret = {};

					list.forEach(item => {
						ret[item.id] = item[identifier];
					});

					cb && cb(null, ret);

					return ret;
				});
		};

	schema.statics.distinctCount = function(field, query){
		// temp. solution. avoids a mongo $ error
		if(field.indexOf('$') !== -1)
			return new Promise((ok, ko) => this.distinctCount_(field, query, (err, r) => err ? ko(err) : ok(r)));

		const agg = this.aggregate();

		if(query && Object.keys(query).length)
			agg.match(query);

		agg
			.group({
				_id: '$' + field,
				total: {$sum: 1}
			})
			.sort({total: -1});

		const result = {};

		return agg.then(r => {
			r.forEach(s => result[s._id] = s.total);

			return result;
		});
	};

	schema.statics.distinctCount_ = function(field, query, cb){
		this.distinct(field, query, (err, d) => {
			if(err)
				return cb(err);
			
			let count = 0;
			let error;
			const ret = {};
			
			d.push(null);
			
			const cQuery = {};

			Object.each(query, (k, q) => cQuery[k] = q);
			
			d.forEach(k => {
				cQuery[field] = k;
				
				this.count(cQuery, (err, c) => {
					if(err)
						error = err;
					
					if(c)
						ret[k] = c;
					
					if(++count === d.length)
						return cb(error, ret);
				});
			});
		});
	};
};