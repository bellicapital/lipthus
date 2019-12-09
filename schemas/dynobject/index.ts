import {LipthusSchema, LipthusSchemaTypes} from '../../lib';
import * as _ from "underscore";
import {KeyAny} from "../../interfaces/global.interface";

const DoSchema = require('./do');
module.exports = function dynobject() {
	const s = new LipthusSchema({
		title: {type: LipthusSchemaTypes.Multilang, caption: '_TITLE'},
		description: {type: LipthusSchemaTypes.Multilang, formtype: 'textarea', caption: '_DESCRIPTION'},
		name: String,
		colname: String,
		tag: String, // blog, category, product, ...
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
		lang: {newItem: {}}, // traducciones relacionadas con el objeto
		list_order: {type: {}, default: {title: 1}}  // Ordenación predeterminada para los listados. Formato pe: {created: -1}
	}, {
		collection: 'dynobjects'
	});

	s.statics = {
		addSchemas: function () {
			return this.getSchemas()
				.then((schemas: any) => Object.each(schemas, (name, schema) => this.db.lipthusDb.schema(name, schema)));
		},
		getSchemas: async function () {
			if (this.schema.options.schemas)
				return this.schema.options.schemas;

			this.schema.options.schemas = {};

			const arr: Array<any> = await this.find();

			arr.forEach(o => {
				const schema = DoSchema.fromModel(o);

				this.schema.options.schemas[schema.options.name] = schema;
			});

			return this.schema.options.schemas;
		},
		getKeys: function () {
			return Object.keys(s.get('schemas'));
		},
		schemas: function () {
			return s.get('schemas');
		},
		taggedKeys: function (tag: string) {
			const ret: Array<any> = [];
			const schemas = s.get('schemas');

			Object.keys(schemas).forEach(k => {
				if (schemas[k].options.tag === tag)
					ret.push(k);
			});

			return ret;
		},
		getItemsArray: async function (req: any) {
			const ret: any = {};

			const obj: Array<any> = await this.find();

			ret.handlers = obj.map(o => o.getDynValues(req));
			const m: Array<any> = await req.site.db.dynobjectsmenu.find();

			ret.menus = m.map(menu => {
				const json = menu.jsonInfo();
				delete json.__v;

				return json;
			});

			return ret;
		},
		checkAll: function (req: any, cb: any) {
			const ret = {dynobjects: <KeyAny>{}};

			this.find((err: Error, dy: Array<any>) => {
				let count = 0;

				dy.forEach(d => {
					req.db[d.colname].checkAll(req, (err2: Error, r: any) => {
						ret.dynobjects[d.colname] = r;

						if (++count === dy.length)
							cb(null, ret);
					});
				});
			});
		}
	};

	s.methods = {
		getDynValues: function (req: any) {
			const ret = this.toObject();

			ret.id = ret._id;
			delete ret._id;
			delete ret.dynvars;

			ret.vars = req.db[ret.colname].getDefinitions();

			return ret;
		},
		getNodeTree: function (req: any, filter: Array<string> | string, levels: number = 1, incOrphans: boolean = true) {
			if (!filter)
				filter = [];
			else if (typeof filter === 'string')
				filter = filter.split(',');

			let models: Array<string>;

			if (incOrphans && this.accept.length) {
				models = this.accept.slice(0); // clone

				if (models.indexOf(this.colname) === -1)
					models.unshift(this.colname);
			} else
				models = [this.colname];

			if (filter.length)
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
					const opt = {sort: <any> {}};

					if (!req.db.schemas[colname].tree.title.multilang)
						opt.sort.title = 1;
					else
						opt.sort['title.' + req.ml.lang] = 1;

					const ret: Array<any> = [];

					return req.db[colname].find(query, '', opt)
						.then((r: Array<any>) => Promise.all(
							r.map(obj => obj.getNodeData(req, levels, filter)
								.then((nData: any) => ret.push(nData))))
						)
						.then(() => ret);
				})
			);
		}
	};

	return s;
};
