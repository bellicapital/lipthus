"use strict";

const mongoose = require('mongoose');
const Schema = require('../lib/eucaschema');
const fs = require('mz/fs');
const debug = require('debug')('site:db');
const path = require('path');
const events = require('events');
const GridFS = require('./../lib/gridfs').GridFS;
const schemaGlobal = require('./schema-plugins/schema-global');
const schemaStatics = require('./schema-plugins/schema-statics');

debug.log = console.log.bind(console);

// native promises
mongoose.Promise = global.Promise;
mongoose.dbs = {};

require('./schema-types').install();

class Db extends events.EventEmitter {
	constructor(options, site) {
		super();

		let uri = 'mongodb://';

		this.mongoose = mongoose;
		this.schemas = {};
		this.models = {};
		this.name = options.name;
		this.user = options.user;
		this.pass = options.pass;
		this.schemasDir = options.schemasDir;
		this.mongoose.dbs[this.name] = this;

		if (options.user && options.pass)
			uri += options.user + ':' + options.pass + '@';

		uri += (options.host || 'localhost') + '/' + options.name;

		Object.defineProperties(this, {
			site: {value: site, configurable: true},
			app: {value: site.app, configurable: true}
		});

		this._conn = mongoose.createConnection(uri, options.options);

		this._conn.on('error', this.onConnError.bind(this));

		this._conn.once('open', this.onConnOpen.bind(this));
	}

	onConnError(e) {
		this.emit('error', e);
		console.error('Database ' + this.name + ' error!', e);
	}

	onConnOpen() {
		debug('Connected to db ' + this.name);

		// native db
		let ndb = this._conn.db;

		this.fs = new GridFS(ndb, 'fs');

		Object.defineProperties(this._conn, {
			eucaDb: {value: this},
			site: {value: this},
			app: {value: this.app}
		});

		Object.defineProperty(ndb, 'eucaDb', {value: this});

		ndb.on('videoProcessed', item => {
			this.emit('videoProcessed', item);
		});

		const s = require('../schemas/dynobject');
		this.schema(s.name, s(Schema));

		this.addSchemasDir(this.site.cmsDir + '/schemas')
			.then(() => this.dynobject.getSchemas())
			.then(schemas => Object.each(schemas, (name, schema) => this.schema(name, schema)))
			.then(() => this.schemasDir && this.addSchemasDir(this.schemasDir))
			.then(() => this.emit('ready', this))
			.catch(err => console.error(err.stack));
	}

	toString() {
		return this.name;
	}

	db(dbname) {
		return this.site.dbs[dbname];
	}

	get dynobject() {
		return this.model('dynobject');
	}

	model(name) {
		if (this.models[name])
			return this.models[name];

		if (!this.schemas[name]) {
			console.error(new Error("Schema " + name + " hasn't been registered"));
			return;
		}

		this.models[name] = this._conn.model(name, this.schemas[name]);

		//force models with schema references
		this.schemas[name].eachPath((k, path) => {
			const ref = path.constructor.name === 'SchemaArray' ? path.caster.options.ref : path.options.ref;

			if (!ref || ref === name)
				return;

			if (this.schemas[ref])
				this.model(ref);
			else // if the referenced schema is not defined yet, lets queue it
				this.once('schemaDefined', n => n === ref && this.model(ref))
		});

		this.models[name]
			.on('error', console.error.bind(console))
			.on('index', err => err && console.error(this.name + '.' + name, err.message))
			.on('itemCreated', (item, a) => this.emit('itemCreated', item, a))
			.on('itemUpdated', (item, changed, a) => this.emit('itemUpdated', item, changed, a));

		return this.models[name];
	}

	schema(name, schema) {
		schema.set('name', name);
		schema.plugin(schemaGlobal);//, {name: name});
		schema.plugin(schemaStatics);

		//Avoid collection name mongoose pluralization and add easy access throw the schema object
		if (!schema.options.collection)
			schema.options.collection = name;

		Object.defineProperty(this, name, {get: () => this.model(name)});
		Object.defineProperty(schema, 'site', {value: this.site});
		this.schemas[name] = schema;

		this.emit('schemaDefined', name);
	}

	addSchemasDir(dir) {
		return fs.readdir(dir)
			.then(schemas => {
				const promises = [];

				schemas.forEach(file => {
					const fpath = dir + '/' + file;

					promises.push(fs.stat(fpath).then(stat => {
						if (stat.isDirectory())
							return;

						const s = require(fpath);

						if (typeof s === 'function') {
							const name = s.name || path.basename(file, '.js');

							return this.schema(name, s(Schema, this.site));
						}
					}));
				});

				return Promise.all(promises);
			}, err => debug(err))	// catch schemas dir does not exists'))
			.then(() => {
				return fs.readdir(dir + '/plugins')
					.then(plugins => {
						if (plugins) {
							plugins.forEach(plugin => {
								const name = path.basename(plugin, '.js');

								if (this.schemas[name])
									this.schemas[name].plugin(require(dir + '/plugins/' + name), this);
							});
						}
					}, () => {
					});// catch plugin directory doesn't exists
			});
	}

	collection(name, options, cb) {
		let n;

		try {
			n = this.schemas[name].options.collection;
		} catch (e) {
			n = name;
		}

		return this._conn.db.collection(n, options, cb);
	}

	/**
	 *
	 * @param {DBRef} ref
	 * @param {object|function} fields ({title: 1, active: -1})
	 * @returns {Promise}
	 */
	deReference(ref, fields) {
		const modelname = ref.namespace.replace('dynobjects.', '');

		const dbname = ref.db || this.name;
		const db = this.site.dbs[dbname];

		if (!db)
			return Promise.reject(new Error('db ' + dbname + ' not found or not defined in this site'));

		if (!db[modelname])
			return Promise.reject(new Error('model ' + modelname + ' not found in db ' + this));

		return db[modelname].findById(ref.oid, fields);
	}
}

module.exports = Db;
