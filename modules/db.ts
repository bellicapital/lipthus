import * as mongoose from 'mongoose';
import {Site} from "./site";
import {LipthusSchema} from '../lib';
import {schemaGlobalMethods} from "./schema-plugins/schema-global";
import {schemaGlobalStatics} from "./schema-plugins/schema-statics";
import * as Debug from "debug";
import * as path from "path";
import {EventEmitter} from "events";
import {GridFS} from "./../lib";
import {SchemaScript} from "../interfaces/schema-script";
import {TmpModel} from "../schemas/tmp";
import {LipthusCacheModel} from "../schemas/cache";
import {SearchModel} from "../schemas/search";
import {UserModel} from "../schemas/user";
import {SettingModel} from "../schemas/settings";
import {NationalitiesModel} from "../schemas/nationalities";
import {DbParams} from "../interfaces/global.interface";

const fs = require('mz/fs');
const debug = Debug('site:db');

(mongoose as any).dbs = {};
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

export class LipthusDb extends (EventEmitter as new() => any) {

	public name: string;
	public params: DbParams;
	public connected = false;
	public schemas: {[s: string]: LipthusSchema} = {};
	public models: {[s: string]: any} = {};
	public mongoose = mongoose;
	public _conn: any;

	constructor(params: DbParams | string, public site: Site) {
		super();

		if (typeof params === "string")
			params = {name: params};

		this.params = params;
		this.name = params.name;
		(mongoose as any).dbs[this.name] = this;

		Object.defineProperties(this, {
			app: {value: site.app, configurable: true}
		});
	}

	connect() {
		const {uri, options} = this.connectParams();

		this._conn = mongoose.createConnection(uri, options);

		this._conn.once('connected', this.onConnOpen.bind(this));
		this._conn.on('error', this.onConnError.bind(this));
		this._conn.on('disconnected', this.onDisconnected.bind(this));
		this._conn.on('reconnected', this.onReconnected.bind(this));
	}

	connectParams() {
		let uri = 'mongodb://';

		if (this.params.user && this.params.pass)
			uri += this.params.user + ':' + this.params.pass + '@';

		uri += (this.params.host || 'localhost');

		if (this.params.port)
			uri += ':' + this.params.port;

		uri += '/' + this.name;

		const options = this.params.options || {};

		if (!options.promiseLibrary)
			options.promiseLibrary = global.Promise;

		// Avoid a Deprecation warning (connect.mongodb-session sigue con warning si quitamos esto de aqui 20/11/18 · jj)
		if (options.useNewUrlParser === undefined)
			options.useNewUrlParser = true;

		return {uri: uri, options: options};
	}

	addLipthusSchemas() {
		const s = require('../schemas/dynobject');
		this.schema(s.name, s());

		return this.addSchemasDir(this.site.lipthusBuildDir + '/schemas')
			.then(() => this.dynobject.addSchemas());
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
		debug('Connected to db ' + this.name + ' on ' + (this.params.host || 'localhost') + ':' + (this.params.port || '27017'));

		// native db
		const ndb = this._conn.db;

		this.fs = new GridFS(ndb, 'fs');

		this._conn.lipthusDb = this;
		this._conn.eucaDb = this; // deprecated
		this._conn.site = this.site;
		this._conn.app = this.app;

		Object.defineProperty(ndb, 'lipthusDb', {value: this});

		this.emit('ready', this);
	}

	toString() {
		return this.name;
	}

	db(dbname: string) {
		return this.site.dbs[dbname];
	}

	useDb(dbName: string) {
		return this._conn.useDb(dbName);
	}

	get dynobject() {
		return this.model('dynobject');
	}

	get search(): SearchModel {
		return this.model('search');
	}

	get tmp(): TmpModel {
		return this.model('tmp');
	}

	get user(): UserModel {
		return this.model('user');
	}

	get settings(): SettingModel {
		return this.model('settings');
	}

	get cache(): LipthusCacheModel {
		return this.model('cache');
	}

	get cacheResponse() {
		return this.model('cacheResponse');
	}

	get nationalities(): NationalitiesModel {
		return this.model('nationalities');
	}

	model(name: string) { // if (name === 'newsletter') console.trace(name)
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

	schema(name: string, schema: LipthusSchema) {
		schema.options.name = name;
		schema.plugin(schemaGlobalMethods as any);
		schema.plugin(schemaGlobalStatics as any);

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
			.then((schemas: Array<any>) =>
					Promise.all(schemas.map(file => {
						// avoid ts definition files
						if (file.match(/\.d\.ts$/) || !file.match(/.+\.[tj]s/))
							return;

						const fpath = dir + '/' + file;

						return fs.stat(fpath).then((stat: any) => {
							if (stat.isDirectory())
								return;

							const s: SchemaScript | any = require(fpath);
							const name = s.name;

							if (typeof s === 'function') {
								// old compat
								return this.schema(name, s(LipthusSchema, this.site));
							} else if (s.getSchema) {
								return this.schema(s.name, s.getSchema(this.site));
							}
						});
					}))
				, (err: Error) => debug(err)	// catch schemas dir does not exists'))
			)
			.then(() => fs.readdir(dir + '/plugins')
				.then((plugins: Array<string>) => {
					(plugins || []).forEach(plugin => {
						const basename = path.basename(plugin, path.extname(plugin));
						let file = require(dir + '/plugins/' + basename);

						if (!file.getPlugin ) {
							// old compat
							file = {
								name: basename,
								getPlugin: file
							};
						}

						this.addPlugin(file);
					});
				})
				.catch((err: any) => {
					if (err.code !== 'ENOENT')
						console.error(err);
					// else
					// 	debug('No plugins dir for ', dir);
				}) // catch plugin directory doesn't exists
			);
	}

	addPlugin(file: {name: string, getPlugin: any}) {
		if (!this.schemas[file.name])
			throw new Error('Can\'t add plugin. Schema ' + file.name + ' not found. Db: ' + this.name);

		this.schemas[file.name].plugin(file.getPlugin, this);
	}

	collection(name: string, options?: any, cb?: Function) {
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
	deReference(ref: any, fields?: any) {
		const modelName = ref.namespace.replace('dynobjects.', '');

		const dbname = ref.db || this.name;
		const db = this.site.dbs[dbname];

		if (!db)
			return Promise.reject(new Error('db ' + dbname + ' not found or not defined in this site'));

		if (!db[modelName])
			return Promise.reject(new Error('model ' + modelName + ' not found in db ' + this));

		return db[modelName].findById(ref.oid, fields);
	}
}
