"use strict";

const mongoose = require('mongoose');
const _methods = require('./methods');
const _statics = require('./statics');
const Types = mongoose.Schema.Types;
const EucaSchema = require('../../lib/eucaschema');


class DoSchema extends EucaSchema {

	/**
	 *
	 * @param {object} obj
	 * @param {object} options
	 * @returns {DoSchema}
	 */
	constructor(obj, options) {
		super(obj, options);

		this.statics = _statics;
		this.methods = {};

		Object.keys(_methods).forEach(m => {
			this.methods[m] = _methods[m];
		});

		if (!this.options.toJSON)
			this.options.toJSON = {};

		// specify the transform schema option to remove the children virtual
		this.options.toJSON.transform = (doc, ret) => {
			// remove the children of every document before returning the result
			delete ret.parents;
			delete ret.children;
			delete ret.__v;

			this.eachPath((k, path) => {
				switch (path.options.type) {
					case Types.MlSelector:
					case Types.MlCheckboxes:
						ret[k] = ret[k] && ret[k].val;
						break;
				}
			});
		};

		this.post('save', postSave);
		this.pre('remove', preRemove);
		this.virtual('dbRef').get(function () {
			return {
				$ref: this.collection.name,
				$id: this._id,
				$db: this.db.name
			};
		});
	}

	static fromModel(obj) {
		const def = {};

		if(!obj.name)
			obj.name = obj.colname;

		if(!obj.colname)
			obj.colname = obj.name.replace(/s?$/, 's').replace(/ys$/, 'ies');

		Object.keys(obj.dynvars).forEach(k => {
			let dv = obj.dynvars[k];
			let p = {origType: dv.type};

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
					p.type = dv.multilang ? Types.Multilang : String;

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
					p.type = Types.Bdf;
					break;
				case 'image':
					p.type = Types.BdfList;
					p.multi = dv.multi;
					p.noWatermark = !!dv.noWatermark;
					break;
				case 'selector':
				case 'lang':
				case 'country':
					p.type = Array.isArray(p.options) ? Number : String; //Types.Mixed;
					p.formtype = 'selector';
					break;
				case 'checkboxes':
					p.type = Types.MlCheckboxes;
					p.formtype = 'checkboxes';
					break;
				case 'nationality':
					p.type = Types.MlSelector;
					p.formtype = 'selector';
					break;
				case 'audio':
				case 'video':
				case 'file':
					p.type = Types.Fs;
					p.multi = dv.multi;
					break;
				case 'refid':
					p.ref = dv.schema || dv.colname;
					p.index = true;

					if(dv.db)
						p.refdb = dv.db; // cross db (todo)

				case 'user':
				case 'id':
					p.type = Types.ObjectId;
					break;
				case 'location':
					p.type = {
						//TODO
					};
					break;
				default:
					console.error('Var type "' + dv.type + '" not defined. Dynobject->' + obj.colname + '->' + k);
			}

			if (dv.index)
				p.index = dv.index;

			def[k] = p;
		});

		def.rating = {type: Number, index: true, default: 2.5};
		def.ratingCount = Number;
		def.parents = [{}];
		def.children = [{}];

		const schema = new DoSchema(def, {
			identifier: obj.identifier || 'title',
			descIdentifier: obj.descIdentifier || 'description',
			name: obj.name || obj.colname,
			collection: 'dynobjects.' + obj.colname,
			lastMod: true,
			created: true,
			submitter: true,
			modifier: true,
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

		this[obj.name] = schema;
	}
}


	//Check hierarchy
const postSave = function(doc){
	//puede ser un subdocumento
	if(!this.db)
		return;

	doc.parents && doc.parents.forEach(dbref => {
		if(!dbref.db)
			dbref.db = this.db.name;

		const parentModel = this.db.models[dbref.namespace.replace('dynobjects.', '')];

		if (!parentModel)
			return;

		this.db.eucaDb.deReference(dbref)
			.then(parent => {
				if(!parent)
					return;

				parent = parentModel(parent);

				let found = false;

				parent.children.forEach(child => {
					if(child.oid + '' === doc._id + ''){
						found = true;

						return false;
					}
				});

				if(!found){
					parent.children.push(doc.getDBRef());

					Promise.resolve(parent.update({children: parent.children})).catch(err => {throw err});
				}
			});
	});

	//TODO: check children
};

module.exports = DoSchema;

const preRemove = function(next){
	const id = this.id;

	this.loadFiles().then(ff => {
		if(!ff.length)
			return next();

		let count = 0;

		ff.forEach(f => {
			f.items.forEach((item, idx) => {
				if(item.oid.toString() === id)
					f.items.splice(idx, 1);
			});

			const func = f.items.length ? 'save' : 'remove';

			f[func](() => {
				if(++count === ff.length)
					next();
			});
		});
	}, next);
};
