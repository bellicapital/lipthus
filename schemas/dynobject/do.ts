import {LipthusSchema, LipthusSchemaTypes} from "../../lib";

const _methods = require('./methods');
const _statics = require('./statics');
const Types = LipthusSchema.Types;


class DoSchema extends LipthusSchema {

	/**
	 *
	 * @param {object} obj
	 * @param {object} options
	 * @returns {DoSchema}
	 */
	constructor(obj: any, options: any = {}) {
		super(obj, options);

		this.statics = _statics;
		this.methods = {};

		Object.keys(_methods).forEach(m => {
			this.methods[m] = _methods[m];
		});

		if (!this.options.toJSON)
			this.options.toJSON = {};

		// specify the transform schema option to remove the children virtual
		this.options.toJSON.transform = (doc: any, ret: any) => {
			// remove the children of every document before returning the result
			delete ret.parents;
			delete ret.children;
			delete ret.__v;

			this.eachPath((k: string, path: any) => {
				switch (path.options.type) {
					case LipthusSchemaTypes.MlSelector:
					case LipthusSchemaTypes.MlCheckboxes:
						ret[k] = ret[k] && ret[k].val;
						break;
				}
			});
		};

		this.post('save', postSave);
		this.pre('remove', preRemove);
		this.virtual('dbRef').get(function (this: any) {
			return {
				$ref: this.collection.name,
				$id: this._id,
				$db: this.db.name
			};
		});
	}

	static fromModel(obj: any) {
		const def: any = {
			rating: {type: Number, index: 1, default: 2.5},
			ratingCount: Number,
			parents: [{}],
			children: [{}],
			submitter: {type: LipthusSchemaTypes.ObjectId, ref: 'user'},
			parent: {type: LipthusSchemaTypes.ObjectId, ref: 'fsfiles' }
		};

		if (!obj.name)
			obj.name = obj.colname;

		if (!obj.colname)
			obj.colname = obj.name.replace(/s?$/, 's').replace(/ys$/, 'ies');

		Object.keys(obj.dynvars).forEach(k => {
			const dv: any = obj.dynvars[k];
			const p: any = {origType: dv.type};

			['caption', 'required', 'list', 'formtype', 'options'].forEach(key => {
				if (dv[key])
					p[key] = dv[key];
			});

			if (dv.value)
				p.default = dv.value;

			if (dv.multilang)
				p.multilang = true;

			//noinspection FallThroughInSwitchStatementJS
			switch (dv.type) {
				case 'url':
				case 'email':
					p.type = String;
					p.translatable = false;
					break;
				case 'text':
				case 'textarea':
					p.type = dv.multilang ? LipthusSchemaTypes.Multilang : String;

					if (dv.multilang)
						p.translatable = dv.translatable === undefined ? true : dv.translatable;
					break;
				case 'bolean':
				case 'boolean':
					p.type = Boolean;
					break;
				case 'int':
				case 'autoinc':
				case 'float':
				case 'money':
					p.type = Number;
					break;
				case 'langs':
				case 'array':
				case 'multi':
					p.type = [];
					break;
				case 'object':
					p.type = Types.Mixed;
					break;
				case 'date':
				case 'datetime':
				case 'time':
					p.type = Date;

					if (dv.value === 'now')
						p.default = Date.now;
					break;
				case 'signature':
				case 'bdf':
				case 'bdi':
					p.type = LipthusSchemaTypes.Bdf;
					break;
				case 'image':
					p.type = LipthusSchemaTypes.BdfList;
					p.multi = dv.multi;
					// noinspection PointlessBooleanExpressionJS
					p.noWatermark = !!dv.noWatermark;
					break;
				case 'selector':
					switch (dv.valueType) {
						case 'string':
							p.type = String;
							break;
						case 'number':
							p.type = Number;
							break;
						default:
							p.type = Array.isArray(p.options) ? Number : String; // Types.Mixed;
					}
					p.formtype = 'selector';
					break;
				case 'lang':
				case 'country':
					p.type = String;
					p.formtype = 'selector';
					break;
				case 'checkboxes':
					p.type = LipthusSchemaTypes.MlCheckboxes;
					p.formtype = 'checkboxes';
					break;
				case 'nationality':
					p.type = LipthusSchemaTypes.MlSelector;
					p.formtype = 'selector';
					break;
				case 'audio':
				case 'video':
				case 'file':
					p.type = LipthusSchemaTypes.Fs;
					p.multi = dv.multi;
					break;
				case 'refid':
					p.ref = dv.schema || dv.colname;
					p.index = 1;

					if (dv.db)
						p.refdb = dv.db; // cross db (todo)

				case 'user':
				case 'id':
					p.type = LipthusSchemaTypes.ObjectId;
					break;
				case 'location':
					p.type = {
						// TODO
					};
					break;
				default:
					console.error('Var type "' + dv.type + '" not defined. Dynobject->' + obj.colname + '->' + k);
			}

			if (dv.index)
				p.index = dv.index === true ? 1 : dv.index;

			def[k] = p;
		});

		const schema = new DoSchema(def, {
			identifier: obj.identifier || 'title',
			descIdentifier: obj.descIdentifier || 'description',
			name: obj.name || obj.colname,
			collection: 'dynobjects.' + obj.colname,
			lastMod: true,
			created: true,
			removed: true,
			lastActivated: true,
			title: obj.title,
			baseurl: obj.baseurl,
			rss: obj.rss,
			tag: obj.tag,
			subscriptions: !!obj.subscriptions,
			showTranslate: !!obj.showTranslate,
			logUpdates: obj.logUpdates,
			list_order: obj.list_order
		});

		schema.index({'parents.$ref': 1});
		schema.index({'parents.$id': 1});

		(this as any)[obj.name] = schema;
	}
}


// Check hierarchy
const postSave = function (this: any, doc: any) {
	// puede ser un subdocumento
	if (!this.db)
		return;

	if (!doc.parents)
		return;

	doc.parents.forEach((dbref: any) => {
		if (!dbref.db)
			dbref.db = this.db.name;

		const parentModel = this.db.models[dbref.namespace.replace('dynobjects.', '')];

		if (!parentModel)
			return;

		this.db.eucaDb.deReference(dbref)
			.then((parent: any) => {
				if (!parent)
					return;

				parent = parentModel(parent);

				let found = false;

				parent.children.forEach((child: any) => {
					if (child.oid + '' === doc._id + '') {
						found = true;

						return false;
					}
				});

				if (!found) {
					parent.children.push(doc.getDBRef());

					Promise.resolve(parent.update({children: parent.children})).catch(err => {
						throw err;
					});
				}
			});
	});

	// TODO: check children
};

module.exports = DoSchema;

const preRemove = function (this: any, next: () => {}) {
	const id = this.id;

	this.loadFiles().then((ff: Array<any>) => {
		if (!ff.length)
			return next();

		let count = 0;

		ff.forEach(f => {
			f.items.forEach((item: any, idx: number) => {
				if (item.oid.toString() === id)
					f.items.splice(idx, 1);
			});

			const func = f.items.length ? 'save' : 'remove';

			f[func](() => {
				if (++count === ff.length)
					next();
			});
		});
	}, next);
};
