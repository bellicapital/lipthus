/* global process, module */

"use strict";

const mongoose = require('mongoose');
const BinDataFile = require('../modules/bdf');
const debug = require('debug')('site:form');


class EucaForm
{
	constructor(req)
	{
		this.req = req;
		this.itemid = req.params.itemid;

		let collection = req.params.schema.split(/\.(.+)?/);

		if(collection.length === 1){
			this.db = req.db;
			this.schemaName = req.params.schema;
		} else {
			this.db = req.site.dbs[collection[0]];
			this.schemaName = collection[1];
		}

		this.schema = this.db.schemas[this.schemaName];
		this.itemModel = this.db.model(this.schemaName);

		this.isTmp = !this.itemid;

		this.isTmp ? this.initSessionForm(req.sessionID) : this.initItemForm();
	}

	static processReq(req)
	{
		const f = new EucaForm(req);

		if (!req.params.cmd)
			return f.get();

		switch (req.params.cmd) {
			case 'get':
				return f.get();
			case 'set':
				return f.set(req.body.name, req.body.value);
			case 'unset':
				return f.unset(req.body.name);
			case 'submit':
				return f.submit();
			case 'sortfield':
				return f.sortField(req.body.name, req.body.keys);
			default:
				const err = new Error('Not found');
				err.http_code = 404;
				return Promise.reject(err);
			}
	}

	initSessionForm(sessionID)
	{
		this.model = this.db.tmp;
		this.query = {key: this.schemaName + '_' + sessionID};
	}

	initItemForm()
	{
		this.model = this.db[this.schemaName];
		this.query = {_id: mongoose.Schema.Types.ObjectId.prototype.cast(this.itemid)};
	}
	get()
	{
		return this.model.findOne(this.query)
			.then(r => {
				if (!r || (this.isTmp && !r.value))
					return r || {};

				if (!this.isTmp)
					return rjsonInfoIncFiles();

				let v = r.value;

				let obj = new this.itemModel(r.value);

				Object.keys(v).forEach(k => {
					if (!obj.schema.paths[k])
						console.error('Error: Field ' + k + ' not found in schema ' + this.schemaName);
					else {
						switch (obj.schema.paths[k].options.type) {
							case mongoose.Schema.Types.Bdf:
								v[k] = BinDataFile.fromMongo(v[k], {
									collection: 'tmp',
									id: r._id,
									field: 'value.' + k
								});
								break;
							case mongoose.Schema.Types.BdfList:
								Object.keys(v[k]).forEach(i => {
									v[k][i] = BinDataFile.fromMongo(v[k][i], {
										collection: 'tmp',
										id: r._id,
										field: 'value.' + k + '.' + i
									});
								});
								break;
						}

						//obj.set(v) no funciona con los multi-idioma
						obj[k] = v[k];
					}
				});

				return obj.jsonInfoIncFiles();
			});
	}
	set(name, value) {
		const match = name.match(/^(.+)\[(.+)\]\.(.+)$/);

		if(match)
			return this.setArraySubdocValue(match[1], match[2], match[3], value);

		return new Promise((ok, ko) => {
			if (!name)
				return ko(new Error('No key provided'));

			const key = this.isTmp ? 'value.' + name : name;
			let update = {};
			let func = 'update';

			if (typeof value === 'string') {
				if (value === 'true')
					value = true;
				else if (value === 'false')
					value = false;
				else
					value = value.trim();
			}

			const schemaDef = this.schema.tree[name];

			if (schemaDef && schemaDef.type && schemaDef.type.prototype) {
				switch (schemaDef.type.name) {
					case 'Number':
						value = parseFloat(value);
						if (isNaN(value))
							return ko(new Error('NaN'));
						break;
					case 'MlSelector':
					case 'MlCheckboxes':
						func = 'updateNative';//5/5/14. jj. findOneAndUpdate no inserta MlSelector
						break;
					case 'Bdf':
						value = BinDataFile.fromString(value, {
							collection: this.isTmp ? 'tmp' : this.schemaName,
							id: this.query._id,
							field: key
						});
						break;
					case 'Date':
						if (value) {
							let date = new Date(value);

							if(isNaN(date))
								date = new Date(parseInt(value));

							value = date;
						}
						break;
					default:
						if (schemaDef.type.prototype.cast)
							value = schemaDef.type.prototype.cast(value);
				}
			} else if(name === 'parents'){
				value.forEach((v, i) => {
					v = JSON.parse(v);
					v.$id = mongoose.Schema.Types.ObjectId.prototype.cast(v.$id);
					value[i] = v;
				});
			}

			if (key.lastIndexOf('.') > 0)
				func = 'updateNative';//5/5/14. jj. findOneAndUpdate no inserta subobjetos

			update[key] = value;

			if (key === 'active' && value === true && this.schema.options.lastActivated)
				update.lastActivated = new Date;

			const options = this.isTmp ? {upsert: true} : null;

			if (!this.isTmp) {
				if (this.schema.options.lastMod)
					update.modified = new Date;

				if (this.schema.options.modifier && this.req.User)
					update.modifier = this.req.User._id;
			}

			update = {$set: update};

			debug(this.schemaName, func, this.query, update, options);

			this.model[func](this.query, update, options, (err, r) => {
				if (err)
					return ko(err);

				const result = r.result || r;

				debug(result);

				this.logUpdate(name, value);

				ok(!!(result.nModified || result.upserted));
			});
		});
	}

	setArraySubdocValue(field, idx, name, value){
		const query = Object.extend({}, this.query);
		const update = {$set: {}};

		update.$set[field + '.$.' + name] = value;

		debug(this.schemaName, query, update);

		return this.model.update(query, update, {upsert: true})
			.then(r => {
				debug(r);

				return !!r.nModified;
			});
	}

	unset(name) {
		const update = {$unset: {}};
		const key = this.isTmp ? 'value.' + name : name;
		const fields = name.split('.');

		update.$unset[key] = true;

		if (this.schema.tree[fields[0]].type !== mongoose.Schema.Types.Fs) {
			return this.model.findOneAndUpdate(this.query, update).then(r => {
				this.logUpdate(name);

				return !!r;
			});
		}

		return new Promise((ok, ko) => {
			this.model.findOne(this.query)
				.then(r => {
					let field = r.get(fields[0]);

					if (!field) return ko(new Error('no field ' + fields[0]));

					if (fields[1])
						field = field[fields[1]];

					this.model.findOneAndUpdate(this.query, update)
						.then(r => {
							this.logUpdate(name);

							if (!field || !field.unlink) {
								if (process.env.NODE_ENV === 'development')
									console.log('No se encuentra el GridFSFile a eliminar ' + name);

								return ok(true);
							}

							field.unlink(function (err) {
								err ? ko(err) : ok(!!r);
							});
						})
						.catch(ko);
				})
				.catch(ko);
		});
	}

	submit(req) {
		return new Promise((ok, ko) => {
			this.db.tmp.findOne(this.query).then(tmp => {
				if (!tmp)
					return ko(new Error('Tmp form not found'));

				let model = this.db[this.schemaName];

				if (!model)
					return ko(new Error('Schema ' + this.schemaName + ' not found'));

				let extra = this.req.body.extra;

				if (extra)
					Object.keys(extra).forEach(i => tmp.value[i] = extra[i]);

				const doc = new model().setCasted(tmp.value);

				if (this.schema.options.modifier && this.req.User)
					doc.submitter = this.req.User._id;

				//solucion temporal para los mlcheckboxes y mlselectors
				let Types = mongoose.Schema.Types;
				let update = {};

				doc.schema.eachPath(function (k, path) {
					switch (path.options.type) {
						case Types.MlSelector:
						case Types.MlCheckboxes:
							if (doc[k]) {
								update[k] = doc[k].val;
								doc[k] = null;
							}
							break;
					}
				});
				//end solucion temporal para los mlcheckboxes y mlselectors

				//No hace falta añadir el hijo al posible padre.
				//El schema dynobject se encarga post save
				doc.save()
					.then(doc => {
						tmp.remove(err => {
							if (err)
								console.warn(err);

							if (!Object.keys(update).length)
								return doc.jsonInfoIncFiles().then(ok, ko);

							//solucion temporal para los mlcheckboxes y mlselectors
							model.updateNative({_id: doc._id}, {$set: update}, err => {
								//end solucion temporal para los mlcheckboxes y mlselectors
								doc.set(update);

								doc.jsonInfoIncFiles().then(ok, ko);
							});
						});
					})
					.catch(ko);
			});
		});
	}

	sortField (name, keys) {
		return new Promise((ok, ko) => {
			const update = {$set: {}};

			keys.forEach((k, i) => update.$set[name + '.' + k + '.weight'] = i);

			this.model.updateNative(this.query, update, err => {
				err ? ko(err) : ok(true);
			});
		});
	}

	logUpdate (name, value, cb) {
		const logUpdates = this.schema.options.logUpdates;

		if (!this.isTmp && logUpdates && (logUpdates === true || logUpdates.indexOf(name.replace(/\..+$/, '')) !== -1))
			this.req.logger.logUpdate(this.schemaName, this.query._id, name, value, cb);
		else if (cb)
			cb();
	}
}

module.exports = EucaForm;