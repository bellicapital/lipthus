import {BinDataFile, LipthusDb} from "../modules";
import * as Debug from "debug";
import {LipthusRequest, LipthusSchema, LipthusSchemaTypes} from "../index";
import {Model, Types} from "mongoose";

const debug = Debug('site:form');


class EucaForm {

	public db: LipthusDb;
	public itemId: string;
	public schemaName: string;
	public schema: LipthusSchema;
	private readonly itemModel: any;
	private readonly isTmp: boolean;
	private query!: any;
	private model!: Model<any>;

	constructor(public req: LipthusRequest) {
		this.itemId = req.params.itemid;

		const collection = req.params.schema.split(/\.(.+)?/);

		if (collection.length === 1) {
			this.db = req.db;
			this.schemaName = req.params.schema;
		} else {
			this.db = req.site.dbs[collection[0]];
			this.schemaName = collection[1];
		}

		this.schema = this.db.schemas[this.schemaName];
		this.itemModel = this.db.model(this.schemaName);

		this.isTmp = !this.itemId;

		this.isTmp ? this.initSessionForm(req.sessionID) : this.initItemForm();
	}

	static processReq(req: LipthusRequest) {
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
				const err: any = new Error('Not found');
				err.http_code = 404;
				return Promise.reject(err);
		}
	}

	initSessionForm(sessionID: string) {
		this.model = this.db.tmp;
		this.query = {key: this.schemaName + '_' + sessionID};
	}

	initItemForm() {
		this.model = this.db[this.schemaName];
		this.query = {_id: Types.ObjectId(this.itemId)};
	}

	get() {
		return this.model.findOne(this.query)
			.then(r => {
				if (!r || (this.isTmp && !r.value))
					return r || {};

				if (!this.isTmp)
					return r.jsonInfoIncFiles();

				const v = r.value;

				const obj = new this.itemModel(r.value);

				Object.keys(v).forEach(k => {
					if (!obj.schema.paths[k])
						console.error('Error: Field ' + k + ' not found in schema ' + this.schemaName);
					else {
						switch (obj.schema.paths[k].options.type) {
							case LipthusSchemaTypes.Bdf:
								v[k] = BinDataFile.fromMongo(v[k], {
									collection: 'tmp',
									id: r._id,
									field: 'value.' + k
								});
								break;
							case LipthusSchemaTypes.BdfList:
								Object.keys(v[k]).forEach(i => {
									v[k][i] = BinDataFile.fromMongo(v[k][i], {
										collection: 'tmp',
										id: r._id,
										field: 'value.' + k + '.' + i
									});
								});
								break;
						}

						// obj.set(v) no funciona con los multi-idioma
						obj[k] = v[k];
					}
				});

				return obj.jsonInfoIncFiles();
			});
	}

	set(name: string, value: any) {
		const match = name.match(/^(.+)\[(.+)]\.(.+)$/);

		if (match)
			return this.setArraySubdocValue(match[1], match[2], match[3], value);

		return new Promise((ok, ko) => {
			if (!name)
				return ko(new Error('No key provided'));

			const key = this.isTmp ? 'value.' + name : name;
			const update: any = {};
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
						func = 'updateNative';	// 5/5/14. jj. findOneAndUpdate no inserta MlSelector
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

							if (isNaN(date.getTime()))
								date = new Date(parseInt(value, 10));

							value = date;
						}
						break;
					default:
						if (schemaDef.type.prototype.cast)
							value = schemaDef.type.prototype.cast(value);
				}
			} else if (name === 'parents') {
				value.forEach((val: string, i: number) => {
					const v = JSON.parse(val);
					v.$id = Types.ObjectId(v.$id);
					value[i] = v;
				});
			}

			if (key.lastIndexOf('.') > 0)
				func = 'updateNative';	// 5/5/14. jj. findOneAndUpdate no inserta subobjetos

			update[key] = value;

			if (key === 'active' && value === true && this.schema.options.lastActivated)
				update.lastActivated = new Date;

			const options = this.isTmp ? {upsert: true} : null;

			if (!this.isTmp) {
				if (this.schema.options.lastMod)
					update.modified = new Date;

				if (this.schema.options.modifier && this.req.user)
					update.modifier = this.req.user._id;
			}

			const $set = {$set: update};

			debug(this.schemaName, func, this.query, $set, options);

			(this.model as any)[func](this.query, $set, options)
				.then((r: any) => {
				const result = r.result || r;

				debug(result);

				this.logUpdate(name, value);

				ok(!!(result.nModified || result.upserted));
			})
				.catch(ko);
		});
	}

	setArraySubdocValue(field: string, idx: string, name: string, value: any) {
		const query = Object.assign({}, this.query);
		const update: any = {$set: {}};

		update.$set[field + '.$.' + name] = value;

		debug(this.schemaName, query, update);

		return this.model.updateOne(query, update, {upsert: true})
			.then(r => {
				debug(r);

				return !!r.nModified;
			});
	}

	unset(name: string) {
		const update: any = {$unset: {}};
		const key = this.isTmp ? 'value.' + name : name;
		const fields = name.split('.');

		update.$unset[key] = true;

		if (this.schema.tree[fields[0]].type !== LipthusSchemaTypes.Fs) {
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
						.then((r2: any) => {
							this.logUpdate(name);

							if (!field || !field.unlink) {
								if (process.env.NODE_ENV === 'development')
									console.log('No se encuentra el GridFSFile a eliminar ' + name);

								return ok(true);
							}

							field.unlink((err: Error) => err ? ko(err) : ok(!!r2));
						})
						.catch(ko);
				})
				.catch(ko);
		});
	}

	submit() {
		return new Promise((ok, ko) => {
			this.db.tmp.findOne(this.query).then(tmp => {
				if (!tmp)
					return ko(new Error('Tmp form not found'));

				const model = this.db[this.schemaName];

				if (!model)
					return ko(new Error('Schema ' + this.schemaName + ' not found'));

				const extra = this.req.body.extra;

				if (extra)
					Object.keys(extra).forEach(i => tmp.value[i] = extra[i]);

				const doc = new model().setCasted(tmp.value);

				if (this.schema.options.modifier && this.req.user)
					doc.submitter = this.req.user._id;

				// solución temporal para los mlCheckbox y mlSelector
				const update: any = {};

				doc.schema.eachPath((k: string, path: any) => {
					switch (path.options.type) {
						case LipthusSchemaTypes.MlSelector:
						case LipthusSchemaTypes.MlCheckboxes:
							if (doc[k]) {
								update[k] = doc[k].val;
								doc[k] = null;
							}
							break;
					}
				});
				// end solución temporal para los mlCheckbox y mlSelector

				// No hace falta añadir el hijo al posible padre.
				// El schema dynobject se encarga post save
				doc.save()
					.then((doc2: any) =>
						tmp.remove(err => {
							if (err)
								console.warn(err);

							if (!Object.keys(update).length)
								return doc2.jsonInfoIncFiles().then(ok, ko);

							// solución temporal para los mlCheckbox y mlSelector
							model.collection.updateOne({_id: doc2._id}, {$set: update}, () => {
								// end solución temporal para los mlCheckbox y mlSelector
								doc2.set(update);

								doc2.jsonInfoIncFiles().then(ok, ko);
							});
						})
					)
					.catch(ko);
			});
		});
	}

	sortField(name: string, keys: Array<string>) {
		return new Promise((ok, ko) => {
			const update: any = {$set: {}};

			keys.forEach((k, i) => update.$set[name + '.' + k + '.weight'] = i);

			this.model.collection.updateOne(this.query, update, err => {
				err ? ko(err) : ok(true);
			});
		});
	}

	logUpdate(name: string, value?: any) {
		const logUpdates = this.schema.options.logUpdates;

		if (!this.isTmp && logUpdates && (logUpdates === true || logUpdates.indexOf(name.replace(/\..+$/, '')) !== -1))
			return this.req.logger.logUpdate(this.schemaName, this.query._id, name, value);
		else
			return Promise.resolve();
	}
}

module.exports = EucaForm;
