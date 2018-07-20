"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const lib_1 = require("../lib");
const schema_global_1 = require("./schema-plugins/schema-global");
const schema_statics_1 = require("./schema-plugins/schema-statics");
const Debug = require("debug");
const path = require("path");
const events_1 = require("events");
const lib_2 = require("./../lib");
const fs = require('mz/fs');
const debug = Debug('site:db');
debug.log = console.log.bind(console);
mongoose.dbs = {};
class LipthusDb extends events_1.EventEmitter {
    constructor(params, site) {
        super();
        this.params = params;
        this.site = site;
        this.connected = false;
        this.schemas = {};
        this.models = {};
        this.mongoose = mongoose;
        this.name = params.name;
        mongoose.dbs[this.name] = this;
        Object.defineProperties(this, {
            app: { value: site.app, configurable: true }
        });
    }
    connect() {
        let uri = 'mongodb://';
        if (this.params.user && this.params.pass)
            uri += this.params.user + ':' + this.params.pass + '@';
        uri += (this.params.host || 'localhost') + '/' + this.name;
        this._conn = mongoose.createConnection(uri, this.params.options || { promiseLibrary: global.Promise });
        this._conn.once('connected', this.onConnOpen.bind(this));
        this._conn.on('error', this.onConnError.bind(this));
        this._conn.on('disconnected', this.onDisconnected.bind(this));
        this._conn.on('reconnected', this.onReconnected.bind(this));
    }
    addLipthusSchemas() {
        const s = require('../schemas/dynobject');
        this.schema(s.name, s());
        return this.addSchemasDir(this.site.lipthusBuildDir + '/schemas')
            .then(() => this.dynobject.addSchemas());
    }
    onConnError(e) {
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
        this.fs = new lib_2.GridFS(ndb, 'fs');
        this._conn.lipthusDb = this;
        Object.defineProperties(this._conn, {
            eucaDb: { value: this },
            site: { value: this.site },
            app: { value: this.app }
        });
        Object.defineProperty(ndb, 'eucaDb', { value: this });
        ndb.on('videoProcessed', (item) => this.emit('videoProcessed', item));
        this.emit('ready', this);
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
    get search() {
        return this.model('search');
    }
    get tmp() {
        return this.model('tmp');
    }
    get user() {
        return this.model('uset');
    }
    get settings() {
        return this.model('settings');
    }
    get cache() {
        return this.model('cache');
    }
    get cacheResponse() {
        return this.model('cacheResponse');
    }
    get nationalities() {
        return this.model('nationalities');
    }
    model(name) {
        if (this.models[name])
            return this.models[name];
        if (!this.schemas[name]) {
            console.error(new Error("Schema " + name + " hasn't been registered"));
            return;
        }
        this.models[name] = this._conn.model(name, this.schemas[name]);
        // force models with schema references
        this.schemas[name].eachPath((k, p) => {
            const ref = p.constructor.name === 'SchemaArray' ? p.caster.options.ref : p.options.ref;
            if (!ref || ref === name)
                return;
            if (this.schemas[ref])
                this.model(ref);
            else // if the referenced schema is not defined yet, lets queue it
                this.once('schemaDefined', (n) => n === ref && this.model(ref));
        });
        this.models[name]
            .on('error', console.error.bind(console))
            .on('index', (err) => err && console.error(this.name + '.' + name, err.message))
            .on('itemCreated', (item, a) => this.emit('itemCreated', item, a))
            .on('itemUpdated', (item, changed, a) => this.emit('itemUpdated', item, changed, a));
        return this.models[name];
    }
    schema(name, schema) {
        schema.set('name', name);
        schema.plugin(schema_global_1.schemaGlobalMethods);
        schema.plugin(schema_statics_1.schemaGlobalStatics);
        // Avoid collection name mongoose pluralization and add easy access throw the schema object
        if (!schema.options.collection)
            schema.options.collection = name;
        Object.defineProperty(this, name, { get: () => this.model(name) });
        Object.defineProperty(schema, 'site', { value: this.site });
        this.schemas[name] = schema;
        this.emit('schemaDefined', name);
    }
    addSchemasDir(dir) {
        return fs.readdir(dir)
            .then((schemas) => Promise.all(schemas.map(file => {
            // avoid ts definition files
            if (file.match(/\.d\.ts$/) || !file.match(/.+\.[tj]s/))
                return;
            const fpath = dir + '/' + file;
            return fs.stat(fpath).then((stat) => {
                if (stat.isDirectory())
                    return;
                const s = require(fpath);
                const name = s.name;
                if (typeof s === 'function') {
                    // old compat
                    return this.schema(name, s(lib_1.LipthusSchema, this.site));
                }
                else if (s.getSchema) {
                    return this.schema(s.name, s.getSchema(this.site));
                }
            });
        })), (err) => debug(err) // catch schemas dir does not exists'))
        )
            .then(() => fs.readdir(dir + '/plugins')
            .then((plugins) => {
            (plugins || []).forEach(plugin => {
                const basename = path.basename(plugin, path.extname(plugin));
                let file = require(dir + '/plugins/' + basename);
                if (!file.getPlugin) {
                    // old compat
                    file = {
                        name: basename,
                        getPlugin: file
                    };
                }
                this.addPlugin(file);
            });
        })
            .catch((err) => {
            if (err.code !== 'ENOENT')
                console.error(err);
            // else
            // 	debug('No plugins dir for ', dir);
        }) // catch plugin directory doesn't exists
        );
    }
    addPlugin(file) {
        if (!this.schemas[file.name])
            throw new Error('Can\'t add plugin. Schema ' + file.name + ' not found. Db: ' + this.name);
        this.schemas[file.name].plugin(file.getPlugin, this);
    }
    collection(name, options, cb) {
        let n;
        try {
            n = this.schemas[name].options.collection;
        }
        catch (e) {
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
exports.LipthusDb = LipthusDb;
