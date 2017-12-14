"use strict";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const plugins = {
		lastMod: require('../modules/schema-plugins/lastmod')
	,	created: require('../modules/schema-plugins/created')
	,	submitter: require('../modules/schema-plugins/submitter')
	,	modifier: require('../modules/schema-plugins/modifier')
	,	location: require('../modules/schema-plugins/location')
	,	lastActivated: require('../modules/schema-plugins/lastActivated')
	,	removed: require('../modules/schema-plugins/removed')
};

require('./query');

class EucaSchema extends Schema {

	/**
	 *
	 * @param {object} obj
	 * @param {object} options
	 * @returns {DoSchema}
	 */
	constructor(obj, options) {
		super(obj, options);

		this.__setExtraOptions();
		this.__setEvents();
	}

	static get Types() {
		return Schema.Types
	}

	__setExtraOptions() {
		Object.each(plugins, (k, v) => {
			if (this.options[k])
				this.plugin(v);
		});
	}

	fileFields() {
		const fileFields = [];

		this.eachPath((k) => {
			if (this.getTypename(k) === 'Fs')
				fileFields.push(k);
		});

		return fileFields;
	}

	getTypename(k) {
		let tree = this.tree;
		const keys = k.split('.');

		keys.forEach(k => tree = tree[k]);

		if (tree.constructor.name !== 'Array') {
			if (tree.name)
				return tree.name;

			if (tree.type && tree.type.name)
				return tree.type.name;

			if (tree.formtype === 'location')
				return tree.formtype;

			return tree.constructor.name;
		}
		//Is array
		return tree.length ? tree[0].name : 'Array';
	}

	toString() {
		return this.options && (this.options.name || this.options.collection) || 'EucaSchema';
	}

	getTitle() {
		return this.options.title;
	}

	__setEvents() {
		this.post('created', a => {
			//se activa para subdocumentos ('EmbeddedDocument')
			if (this.constructor.name !== 'model')
				return;

			this.db.models[this.options.name].emit('itemCreated', this, a);
		});

		this.post('update', function(){
			//se activa para subdocumentos ('EmbeddedDocument')
			this.model.emit('itemUpdated', {conditions: this._conditions, update: this._compiledUpdate}, this);
		});

		this.post('remove', () => {
			//se activa para subdocumentos ('EmbeddedDocument')
			try {
				this.db.models[this.options.name].emit('itemRemoved', this);
			} catch(e){}
		});

		this.pre('save', function (next) {
			this._changed = this.modifiedPaths();
			this._isNew = this.isNew;
			next();
		});

		this.post('save', function () {
			if (this._isNew) {
				//se activa para subdocumentos ('EmbeddedDocument')
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

		this.post('init', a => this.eachPath(p => {
			if(a[p] && this.path(p).constructor.name === 'Multilang')
				Object.defineProperty(a[p], '_id', {value: a._id});
		}));
	}
}

mongoose.EucaSchema = EucaSchema;

module.exports = EucaSchema;
