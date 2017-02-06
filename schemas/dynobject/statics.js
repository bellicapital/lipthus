"use strict";

const mongoose = require('mongoose');

module.exports = {
	/**
	 *
	 * @param {object} req
	 * @param {object} query
	 * @param {*} fields
	 * @param {*} options
	 */
	findAndGetValuesWithCommentCount (req, query, fields, options){
		if(!req || !req.ml)
			return Promise.reject(new Error('Invalid request'));

		const Comment = this.db.models.comment;

		return this
			.find(query, fields, options)
			.values(req)
			.then(r => {
				if(!r)
					return;

				const ids = [];

				r.forEach(item => ids.push(item._id));

				return Comment.countById({'ref.$id': {$in: ids}, active: true})
					.then(comments => r.forEach(item => item.comments = comments[item._id] || 0))
					.then(() => r);
			});
	},
	//cb retorna err, values, docs
	// @deprecated. Use find().values(req)
	findAndGetValues (req, query, fields, options, cb){
		console.warn('findAndGetValues callback function is deprecated. Now uses Promise.');

		this.find(query, fields, options, (err, result) => {
			if(err || !result)
				return cb(err, result, []);

			const promises = [];

			result.forEach(item => promises.push(item.getValues(req)));

			Promise.all(promises).then(values => cb(null, values, result)).catch(cb);
		});
	},
	getByParent (parentId, fields, options, cb){
		return this.find({'parents.$id': new mongoose.Types.ObjectId(parentId)}, fields, options, cb);
	},
	checkAll (req, cb){
		const ret = {};
		const dates = [];
		const exclude = ['modified', 'created'];

		this.schema.eachPath(function(name, path){
			if(path.options.type === Date && exclude.indexOf(name) === -1)
				dates.push(name);
		});

		this.find(function(err, r){
			r.forEach(doc => {
				if(doc === null)
					return cb(null, {repaired: ret});

				dates.forEach(d => {
					if(!doc[d] || doc[d] instanceof Date)
						return;

					if(!ret[d])
						ret[d] = 1;
					else
						++ret[d];

					const match = doc[d].match(/^(\d+)[\/-](\d+)[\/-](\d+)/);

					if(match)
						doc[d] = new Date(match[3], match[2], match[1]);
					else
						doc[d] = new Date(doc[d]);

					if(doc[d].toString() === 'Invalid Date')
						delete doc[d];

					const update = {$set: {}};

					update.$set[d] = doc[d];

					this.update({_id: doc._id}, update, function(){});
				});
			});

			cb(null, {repaired: ret});
		});
	},
	translatableFieldList (){
		const fields = [];
		const st = this.schema.tree;

		Object.each(st, (i, v) => {
			if (v.translatable)
				fields.push(i);
		});

		return fields;
	},
	colTitle (lang){
		return this.schema.options.title.getLang(lang);
	},
	getCleanVars4Edit (cb){
		const ret = new this().toObject();
		
		delete ret._id;
		delete ret.parents;
		delete ret.children;
		delete ret.rating;
		
		cb( null, ret);
	}
};