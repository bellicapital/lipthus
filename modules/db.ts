import * as mongoose from 'mongoose';
import {Site} from "./site";
import {DBRef} from "bson";
import * as Schema from '../lib/eucaschema';

const fs = require('mz/fs');
const debug = require('debug')('site:db');
const path = require('path');
const events = require('events');
const GridFS = require('./../lib/gridfs').GridFS;
const schemaGlobal = require('./schema-plugins/schema-global');
const schemaStatics = require('./schema-plugins/schema-statics');

debug.log = console.log.bind(console);

// native promises
// mongoose.Promise = global.Promise;
(mongoose as any).dbs = {};

require('./schema-types').install();

export class Db extends (events.EventEmitter as { new(): any; }) {
	constructor(options: any, site: Site) {
		super();
		
		let uri = 'mongodb://';
		
		this.mongoose = mongoose;
		this.schemas = {};
		this.models = {};
		this.name = options.name;
		this.user = options.user;
		this.pass = options.pass;
		this.schemasDir = options.schemasDir;
		(mongoose as any).dbs[this.name] = this;
		this.connected = false;
		
		if (options.user && options.pass)
			uri += options.user + ':' + options.pass + '@';
		
		uri += (options.host || 'localhost') + '/' + options.name;
		
		Object.defineProperties(this, {
			site: {value: site, configurable: true},
			app: {value: site.app, configurable: true}
		});
		
		this._conn = mongoose.createConnection(uri, options.options || {promiseLibrary: global.Promise});
		
		this._conn.once('connected', this.onConnOpen.bind(this));
		this._conn.on('error', this.onConnError.bind(this));
		this._conn.on('disconnected', this.onDisconnected.bind(this));
		this._conn.on('reconnected', this.onReconnected.bind(this));
	}
	
	onConnError(e: any) {
		this.connected = false;
		console.error('Database ' + this.name + ' error!', e);
		this.emit('error', e);
	}
	
	onDisconnected() {
		this.connected = false;
		console.error('Database ' + this.name + ' disconnected!');
		this.emit('error', new Error('disconnected'));
		
		// si se rompe la conexión salimos del proceso con error para que en producción pm2 intente reiniciar
		process.exit(1);
	}
	
	onReconnected() {
		this.connected = true;
		console.error('Database ' + this.name + ' reconnected!');
	}
	
	onConnOpen() {
		this.connected = true;
		debug('Connected to db ' + this.name);
		
		// native db
		const ndb = this._conn.db;
		
		this.fs = new GridFS(ndb, 'fs');
		
		Object.defineProperties(this._conn, {
			eucaDb: {value: this},
			site: {value: this},
			app: {value: this.app}
		});
		
		Object.defineProperty(ndb, 'eucaDb', {value: this});
		
		ndb.on('videoProcessed', (item: any) => this.emit('videoProcessed', item));
		
		const s = require('../schemas/dynobject');
		this.schema(s.name, s(Schema));
		
		this.addSchemasDir(this.site.cmsDir + '/schemas')
			.then(() => this.dynobject.getSchemas())
			.then((schemas: any) => Object.each(schemas, (name, schema) => this.schema(name, schema)))
			.then(() => this.schemasDir && this.addSchemasDir(this.schemasDir))
			.then(() => this.emit('ready', this))
			.catch((err: any) => console.error(err.stack));
		
		// process.on('SIGINT', () => {
		// 	this._conn.close(() => {
		// 		console.log("Mongoose connection to " + this.name + " is disconnected due to application termination");
		//
		// 		setTimeout(() => process.exit(0), 300);
		// 	});
		// });
	}
	
	toString() {
		return this.name;
	}
	
	db(dbname: string) {
		return this.site.dbs[dbname];
	}
	
	get dynobject() {
		return this.model('dynobject');
	}
	
	model(name: string) {
		if (this.models[name])
			return this.models[name];
		
		if (!this.schemas[name]) {
			console.error(new Error("Schema " + name + " hasn't been registered"));
			return;
		}
		
		this.models[name] = this._conn.model(name, this.schemas[name]);
		
		// force models with schema references
		this.schemas[name].eachPath((k: string, p: any) => {
			const ref = p.constructor.name === 'SchemaArray' ? p.caster.options.ref : p.options.ref;
			
			if (!ref || ref === name)
				return;
			
			if (this.schemas[ref])
				this.model(ref);
			else // if the referenced schema is not defined yet, lets queue it
				this.once('schemaDefined', (n: string) => n === ref && this.model(ref));
		});
		
		this.models[name]
			.on('error', console.error.bind(console))
			.on('index', (err: Error) => err && console.error(this.name + '.' + name, err.message))
			.on('itemCreated', (item: any, a: any) => this.emit('itemCreated', item, a))
			.on('itemUpdated', (item: any, changed: any, a: any) => this.emit('itemUpdated', item, changed, a));
		
		return this.models[name];
	}
	
	schema(name: string, schema: any) {
		schema.set('name', name);
		schema.plugin(schemaGlobal); // , {name: name});
		schema.plugin(schemaStatics);
		
		// Avoid collection name mongoose pluralization and add easy access throw the schema object
		if (!schema.options.collection)
			schema.options.collection = name;
		
		Object.defineProperty(this, name, {get: () => this.model(name)});
		Object.defineProperty(schema, 'site', {value: this.site});
		this.schemas[name] = schema;
		
		this.emit('schemaDefined', name);
	}
	
	addSchemasDir(dir: string) {
		return fs.readdir(dir)
			.then((schemas: Array<any>) => {
				const promises = schemas.map(file => {
					const fpath = dir + '/' + file;
					
					return fs.stat(fpath).then((stat: any) => {
						if (stat.isDirectory())
							return;
						
						const s = require(fpath);
						
						if (typeof s === 'function') {
							const name = s.name || path.basename(file, '.js');
							
							return this.schema(name, s(Schema, this.site));
						}
					});
				});
				
				return Promise.all(promises);
			}, (err: Error) => debug(err))	// catch schemas dir does not exists'))
			.then(() => {
				return fs.readdir(dir + '/plugins')
					.then((plugins: Array<string>) => {
						if (plugins) {
							plugins.forEach(plugin => {
								const name = path.basename(plugin, '.js');
								
								if (this.schemas[name])
									this.schemas[name].plugin(require(dir + '/plugins/' + name), this);
							});
						}
					}, () => {
					}); // catch plugin directory doesn't exists
			});
	}
	
	collection(name: string, options: any, cb: Function) {
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
	deReference(ref: DBRef, fields: any) {
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
