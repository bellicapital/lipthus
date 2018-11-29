import {Types} from "mongoose";
import {LipthusSchema} from "../../lib";
import {KeyAny} from "../../interfaces/global.interface";

export function schemaGlobalStatics(schema: LipthusSchema) {

	schema.statics._updateNative = function (this: any, multiple: boolean, filter: any, update: any) {
		const col = this.db.collection(this.schema.options.collection);
		const keys = Object.keys(update.$set || update.$unset);
		const func = multiple ? 'updateMany' : 'updateOne';

		['modified', 'modifier'].forEach(k => {
			const mod = keys.indexOf(k);

			if (mod > -1)
				keys.splice(mod, 1);
		});

		const ret = col[func].call(col, filter, update);

		// event
		this.find(filter, (err: Error, docs: any) => {
			if (err || !docs || !docs.length)
				return;

			docs.forEach((doc: any) => doc.emit('update', keys));
		});

		return ret;
	};

	schema.statics.updateOneNative = function (this: any, filter: any, update: any) {
		return this._updateNative(false, filter, update);
	};

	schema.statics.updateManyNative = function (this: any, filter: any, update: any) {
		return this._updateNative(true, filter, update);
	};

	schema.statics.findOneField = function (this: any, id: any, fieldName: string, cb: any) {
		const ns = fieldName.split('.');
		const last = ns.length - 1;
		const lastIsArray = /^\d+$/.test(ns[last]);
		let projection: string = fieldName;
		
		if (lastIsArray) {
			const match = projection.match(/^(.+)\.\d+$/);
			
			if (match)
				projection = match[1];
		}
		
		return this.findById(id, projection).then((obj?: any) => {
			if (obj) {
				// first level with Document.get(key)
				obj = obj.get(ns.shift());

				// others
				ns.forEach((v) => obj = obj[v]);
			}
			
			if (cb)
				cb(null, obj);
			else
				return obj;
		});
	};
	
	schema.statics.iFind = function (this: any, query: any, cb: any) {
		if ('function' === typeof query) {
			cb = query;
			query = {};
		} else
			query = query || {};
		
		if (this.schema.paths.active)
			query.active = true;
		
		return this.find(query, null, {sort: {top: -1, _weight: 1}}, cb);
	};

	/**
	 * @deprecated
	 */
	schema.statics.updateNative = function (this: any) {
		const col = this.db.collection(this.schema.options.collection);
		const keys = Object.keys(arguments[1].$set || arguments[1].$unset);
		
		['modified', 'modifier'].forEach(k => {
			const mod = keys.indexOf(k);
			
			if (mod > -1)
				keys.splice(mod, 1);
		});
		
		const ret = col.update.apply(col, arguments);
		
		// evento
		this.find(arguments[0], (err: Error, docs: any) => {
			if (err || !docs || !docs.length)
				return;
			
			docs.forEach((doc: any) => doc.emit('update', keys));
		});
		
		return ret;
	};
	
	schema.statics.updateByIdNative = function (this: any, id: string) {
		arguments[0] = {_id: Types.ObjectId(id)};
		
		return this.updateNative.apply(this, arguments);
	};
	
	/**
	 * Usado para simplificar los comandos desde ajax
	 */
	schema.statics.findOneAndUpdateSafe = function (this: any) {
		const update = arguments[1];
		const cb = arguments[arguments.length - 1] || function () {
		};
		
		this.findOne(arguments[0], (err: Error, doc: any) => {
			if (err) return cb(err);
			
			if (!doc) return cb(err);
			
			doc.set(update);
			
			// 6/5/14 No funciona con objetos. tmp solution
			Object.each(update, (i, u) => {
				if (doc.get(i) !== u) {
					const parts = i.split('.');
					
					if (parts.length === 2) {
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
				.then((doc2: any) => cb(null, doc2 && doc2.jsonInfo()))
				.catch(cb);
		});
	};
	
	/**
	 * Usado para simplificar los comandos desde ajax
	 */
	schema.statics.findByIdAndUpdateSafe = function (this: any) {
		arguments[0] = {_id: arguments[0]};
		
		return this.findOneAndUpdateSafe.apply(this, arguments);
	};
	
	/**
	 * @deprecated
	 * @param {type} id
	 * @param {type} key
	 * @param {type} value
	 * @param {function} cb
	 * @returns {Promise}
	 */
	schema.statics.updateItemField = function (this: any, id: Types.ObjectId | string, key: string, value: any, cb: any) {
		console.log('@deprecated schema.statics.updateItemField');
		
		const update: KeyAny = {};
		update[key] = value;
		
		return this.updateOne({_id: id}, update, (err: Error, numberAffected: number) => cb(err, {status: !!numberAffected}));
	};
	
	schema.statics.getDefinition = function (this: any, k: string) {
		const o = this.schema.tree[k];
		const ret: any = {
			caption: o.caption,
			formtype: o.formtype,
			required: o.required,
			list: o.list,
			type: o.origType,
			value: o.default,
			options: o.options
		};
		
		switch (this.schema.getTypename(k)) {
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
		switch (o.origType) {
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
	
	schema.statics.getDefinitions = function (this: any) {
		const common = [
			'children', 'parents', '_id', '__v', 'created', 'modified', 'submitter',
			'modifier', 'rating', 'ratingCount', 'lastActivated', 'removed'
		];
		
		const ret: any = {};
		
		this.schema.eachPath((k: string) => {
			if (common.indexOf(k) === -1)
				ret[k] = this.getDefinition(k);
		});
		
		return ret;
	};
	
	if (!schema.statics.getList)
		schema.statics.getList = function (this: any, query: any = {}) {
			const identifier = this.schema.get('identifier') || 'title';

			return this
				.find(query)
				.select(identifier)
				.then((list: Array<any>) => {
					const ret: KeyAny = {};
					
					list.forEach(item => ret[item.get('_id')] = item.get(identifier));
					
					return ret;
				});
		};
	
	schema.statics.distinctCount = function (this: any, field: string, query?: any) {
		// temp. solution. avoids a mongo $ error
		if (field.indexOf('$') !== -1)
			return new Promise((ok, ko) => this.distinctCount_(field, query, (err: Error, r: number) => err ? ko(err) : ok(r)));
		
		const agg = this.aggregate();
		
		if (query && Object.keys(query).length)
			agg.match(query);
		
		agg
			.group({
				_id: '$' + field,
				total: {$sum: 1}
			})
			.sort({total: -1});
		
		const result: any = {};
		
		return agg.then((r: Array<any>) => r.forEach(s => result[s._id] = s.total))
			.then(() => result);
	};
	
	schema.statics.distinctCount_ = function (this: any, field: string, query: any, cb: any) {
		this.distinct(field, query, (err: Error, d: Array<any>) => {
			if (err)
				return cb(err);
			
			let count = 0;
			let error: Error;
			const ret: {[s: string]: number} = {};
			
			d.push(null);
			
			const cQuery: KeyAny = {};
			
			Object.each(query, (k, q) => cQuery[k] = q);
			
			d.forEach(k => {
				cQuery[field] = k;
				
				this.countDocuments(cQuery, (err2: Error, c: number) => {
					if (err2)
						error = err2;
					
					if (c)
						ret[k] = c;
					
					if (++count === d.length)
						return cb(error, ret);
				});
			});
		});
	};
}
