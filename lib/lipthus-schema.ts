import * as mongoose from 'mongoose';
import {Schema} from "mongoose";

const plugins = {
	lastMod: require('../modules/schema-plugins/lastmod')
	, created: require('../modules/schema-plugins/created')
	, submitter: require('../modules/schema-plugins/submitter')
	, modifier: require('../modules/schema-plugins/modifier')
	, location: require('../modules/schema-plugins/location')
	, lastActivated: require('../modules/schema-plugins/lastActivated')
	, removed: require('../modules/schema-plugins/removed')
};

require('./query');

export class LipthusSchema extends Schema {
	
	public tree: any;
	public db: any;
	public static Types = Schema.Types;
	
	constructor(obj: any, public options: any = {}) {
		super(obj, options);
		
		this.__setExtraOptions();
		this.__setEvents();
	}
	
	__setExtraOptions() {
		Object.each(plugins, (k, v) => {
			if (this.options[k])
				this.plugin(v);
		});
	}
	
	fileFields() {
		const fileFields: string[] = [];
		
		this.eachPath((k) => {
			if (this.getTypename(k) === 'Fs')
				fileFields.push(k);
		});
		
		return fileFields;
	}
	
	getTypename(k: string) {
		let tree = this.tree;
		const keys = k.split('.');
		
		keys.forEach(j => tree = tree[j]);
		
		if (tree.constructor.name !== 'Array') {
			if (tree.name)
				return tree.name;
			
			if (tree.type && tree.type.name)
				return tree.type.name;
			
			if (tree.formtype === 'location')
				return tree.formtype;
			
			return tree.constructor.name;
		}
		// Is array
		return tree.length ? tree[0].name : 'Array';
	}
	
	toString() {
		return this.options && (this.options.name || this.options.collection) || 'LipthusSchema';
	}
	
	getTitle() {
		return this.options.title;
	}
	
	__setEvents() {
		this.post('created', a => {
			// se activa para subdocumentos ('EmbeddedDocument')
			if (this.constructor.name !== 'model')
				return;
			
			this.db.models[this.options.name].emit('itemCreated', this, a);
		});
		
		/**
		 *
		 */
		this.post('update', function (this: any) {
			// se activa para subdocumentos ('EmbeddedDocument')
			this.model.emit('itemUpdated', {conditions: this._conditions, update: this._compiledUpdate}, this);
		});
		
		this.post('remove', () => {
			// se activa para subdocumentos ('EmbeddedDocument')
			try {
				this.db.models[this.options.name].emit('itemRemoved', this);
			} catch (e) {
			}
		});
		
		this.pre('save', function (this: any, next) {
			this._changed = this.modifiedPaths();
			this._isNew = this.isNew;
			next();
		});
		
		this.post('save', function (this: any) {
			if (this._isNew) {
				// se activa para subdocumentos ('EmbeddedDocument')
				if (this.constructor.name !== 'model')
					return;
				
				this.emit('created');
				delete this._isNew;
			} else if (this._changed && this._changed.length) {
				if (this._changed.indexOf('active') !== -1) {
					this.emit(this.active ? 'itemActivated' : 'itemDeactivated');
					
					if (this._changed.length !== 1)
						this.emit('update', this._changed);
				} else
					this.emit('update', this._changed);
			}
			
			delete this._changed;
		});
		
		this.post('init', (a: any) => this.eachPath(p => {
			if (a[p] && this.path(p).constructor.name === 'Multilang')
				Object.defineProperty(a[p], '_id', {value: a._id});
		}));
	}
}

(mongoose as any).LipthusSchema = LipthusSchema;

/**
 * @deprecated (usado en cmjs-newsletter)
 * @type {LipthusSchema}
 */
(mongoose as any).EucaSchema = LipthusSchema;
