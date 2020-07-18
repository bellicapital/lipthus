"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LipthusDb = void 0;
const mongoose = require("mongoose");
const lib_1 = require("../lib");
const schema_global_1 = require("./schema-plugins/schema-global");
const schema_statics_1 = require("./schema-plugins/schema-statics");
const Debug = require("debug");
const path = require("path");
const events_1 = require("events");
const lib_2 = require("./../lib");
const fs_1 = require("fs");
const debug = Debug('site:db');
mongoose.dbs = {};
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
// mongoose.set('debug', true);
class LipthusDb extends events_1.EventEmitter {
    constructor(params, site) {
        super();
        this.site = site;
        this.connected = false;
        this.schemas = {};
        this.models = {};
        this.mongoose = mongoose;
        if (typeof params === "string")
            params = { name: params };
        this.params = params;
        this.name = params.name;
        mongoose.dbs[this.name] = this;
        this.app = site.app;
    }
    connect() {
        const { uri, options } = this.connectParams();
        this._conn = Object.assign(mongoose.createConnection(uri, options), {
            lipthusDb: this,
            eucaDb: this,
            site: this.site,
            app: this.app
        });
        this._conn.setMaxListeners(15);
        this._conn.once('connected', this.onConnOpen.bind(this));
        this._conn.on('error', this.onConnError.bind(this));
        this._conn.on('disconnected', this.onDisconnected.bind(this));
        this._conn.on('reconnected', this.onReconnected.bind(this));
    }
    connectParams() {
        const options = this.params.options || {};
        if (!options.promiseLibrary)
            options.promiseLibrary = global.Promise;
        if (options.useNewUrlParser === undefined)
            options.useNewUrlParser = true;
        if (options.useUnifiedTopology === undefined)
            options.useUnifiedTopology = true;
        let uri = 'mongodb://';
        if (this.params.user && this.params.pass)
            uri += this.params.user + ':' + this.params.pass + '@';
        if (this.params.replicaSet) {
            options.replicaSet = this.params.replicaSet.name;
            uri += this.params.replicaSet.members.join(',');
        }
        else {
            uri += (this.params.host || 'localhost');
            if (this.params.port)
                uri += ':' + this.params.port;
        }
        uri += '/' + this.name;
        return { uri: uri, options: options };
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
        const name = this.params.replicaSet ? ' replica set ' + this.params.replicaSet.name : (this.params.host || 'localhost');
        debug('Connected to db ' + this.name + ' on ' + name + ':' + (this.params.port || '27017'));
        this.setFs();
        this.emit('ready', this);
    }
    setFs() {
        // native db
        const ndb = this._conn.db;
        this.fs = new lib_2.GridFS(ndb, 'fs');
        try {
            Object.defineProperty(ndb, 'lipthusDb', { value: this });
        }
        catch (e) { }
    }
    toString() {
        return this.name;
    }
    db(dbName) {
        return this.site.dbs[dbName];
    }
    // noinspection JSUnusedGlobalSymbols
    useDb(dbName) {
        const ret = this._conn.useDb(dbName);
        ret.site = this.site;
        return ret;
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
        return this.model('user');
    }
    // noinspection JSUnusedGlobalSymbols
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
    get notification() {
        return this.model('notification');
    }
    get lang() {
        return this.model('lang');
    }
    get cacheless() {
        return this.model('cacheless');
    }
    get fsfiles() {
        return this.model('fsfiles');
    }
    get comment() {
        return this.model('comment');
    }
    get logRoute() {
        return this.model('logRoute');
    }
    model(name, schema) {
        if (this.models[name])
            return this.models[name];
        if (!schema)
            schema = this.schemas[name];
        if (!schema) {
            console.error(new Error("Schema " + name + " hasn't been registered"));
            return;
        }
        this.models[name] = this._conn.model(name, this.schemas[name]);
        // force models with schema references
        schema.eachPath((k, p) => {
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
        schema.options.name = name;
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
        const isValid = file => !file.match(/\.d\.ts$/) && file.match(/.+\.[tj]s/);
        return fs_1.promises.readdir(dir)
            .then((schemas) => Promise.all(schemas.filter(isValid).map(file => {
            const fPath = dir + '/' + file;
            return fs_1.promises.stat(fPath).then((stat) => {
                if (stat.isDirectory())
                    return;
                const s = require(fPath);
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
            .then(() => fs_1.promises.readdir(dir + '/plugins')
            .then((plugins) => {
            (plugins || []).filter(isValid).forEach(plugin => {
                const basename = path.basename(plugin, path.extname(plugin));
                let file = require(dir + '/plugins/' + basename);
                if (!file.getPlugin) {
                    // old compat
                    file = {
                        name: basename,
                        getPlugin: file
                    };
                }
                if (!file.name)
                    file.name = basename;
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
        const modelName = ref.namespace.replace('dynobjects.', '');
        const dbName = ref.db || this.name;
        const db = this.site.dbs[dbName];
        if (!db)
            return Promise.reject(new Error('db ' + dbName + ' not found or not defined in this site'));
        if (!db[modelName])
            return Promise.reject(new Error('model ' + modelName + ' not found in db ' + this));
        return db[modelName].findById(ref.oid, fields);
    }
}
exports.LipthusDb = LipthusDb;
