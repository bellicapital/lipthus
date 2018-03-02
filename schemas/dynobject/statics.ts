import {Types} from "mongoose";
import {LipthusRequest} from "../../typings/lipthus";

/**
 *
 * @param {object} req
 * @param {object} query
 * @param {*} fields
 * @param {*} options
 */
export function findAndGetValuesWithCommentCount(this: any, req: LipthusRequest, query = {}, fields?: any | string, options?: any) {
	if (!req || !req.ml)
		return Promise.reject(new Error('Invalid request'));
	
	return this
		.find(query, fields, options)
		.values(req);
	// esto dió problemas en el servidor 26/9/17
	// .then(r => {
	// 	if(!r)
	// 		return;
	//
	// 	const ids = [];
	//
	// 	r.forEach(item => ids.push(item._id));
	//
	// 	return this.db.models.comment.countById({'ref.$id': {$in: ids}, active: true})
	// 		.then(comments => r.forEach(item => item.comments = comments[item._id] || 0))
	// 		.then(() => r);
	// });
}

// cb retorna err, values, docs
// @deprecated. Use find().values(req)
export function findAndGetValues(this: any, req: LipthusRequest, query = {}, fields: any | string, options: any, cb: (err?: Error, result?: any, arr?: Array<any>) => {}) {
	console.warn('findAndGetValues callback function is deprecated. Now uses Promise.');
	
	this.find(query, fields, options, (err: Error, result: Array<any>) => {
		if (err || !result)
			return cb(err, result, []);
		
		Promise.all(result.map(item => item.getValues(req)))
			.then(values => cb(undefined, values, result)).catch(cb);
	});
}

export function getByParent(this: any, parentId: any, fields: any, options: any, cb: () => {}) {
	return this.find({'parents.$id': new Types.ObjectId(parentId)}, fields, options, cb);
}

export function checkAll(this: any, req: any, cb: (err?: Error, r?: any) => {}) {
	const ret = {};
	const dates: Array<any> = [];
	const exclude = ['modified', 'created'];
	
	this.schema.eachPath(function (name: string, path: any) {
		if (path.options.type === Date && exclude.indexOf(name) === -1)
			dates.push(name);
	});
	
	this.find((err: Error, r: Array<any>) => {
		r.forEach(doc => {
			if (doc === null)
				return cb(undefined, {repaired: ret});
			
			dates.forEach(d => {
				if (!doc[d] || doc[d] instanceof Date)
					return;
				
				if (!ret[d])
					ret[d] = 1;
				else
					++ret[d];
				
				const match = doc[d].match(/^(\d+)[\/-](\d+)[\/-](\d+)/);
				
				if (match)
					doc[d] = new Date(match[3], match[2], match[1]);
				else
					doc[d] = new Date(doc[d]);
				
				if (doc[d].toString() === 'Invalid Date')
					delete doc[d];
				
				const update = {$set: {}};
				
				update.$set[d] = doc[d];
				
				this.update({_id: doc._id}, update, () => {});
			});
		});
		
		cb(undefined, {repaired: ret});
	});
}

export function translatableFieldList(this: any) {
	const fields: Array<any> = [];
	const st = this.schema.tree;
	
	Object.each(st, (i, v) => {
		if (v.translatable)
			fields.push(i);
	});
	
	return fields;
}

export function colTitle(this: any, lang: string) {
	return this.schema.options.title.getLang(lang);
}

export function getCleanVars4Edit(this: any) {
	const ret = new this().toObject();
	
	delete ret._id;
	delete ret.parents;
	delete ret.children;
	delete ret.rating;
	
	return ret;
}
