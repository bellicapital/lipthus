"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bdf_1 = require("../bdf");
const lib_1 = require("../../lib");
const Location = require('../geo').location;
class DocValues {
    constructor(values) {
        if (!values)
            return;
        Object.keys(values).forEach(i => {
            this[i] = values[i];
        });
    }
    get id() {
        return this._id.toString();
    }
}
function schemaGlobalMethods(schema) {
    schema.methods.loadFiles = function () {
        const fileFields = this.schema.fileFields();
        let files = [];
        const promises = fileFields.map((field) => {
            if (!this[field])
                return;
            return this[field].loadFiles()
                .then((_files) => files = files.concat(_files));
        });
        return Promise.all(promises)
            .then(() => files);
    };
    schema.methods.getValues = function (req, virtuals, forceTranslate = true) {
        const ret = new DocValues();
        const promises = [];
        this.schema.eachPath((k) => {
            if (!this.isSelected(k))
                return;
            switch (k) {
                case '__v':
                    return;
                case 'children':
                case 'parents':
                    const v = this.get(k);
                    if (v !== undefined)
                        ret[k] = v;
                    break;
                default:
                    promises.push(this.getVar(k, req, forceTranslate)
                        .then((v2) => {
                        if (v2 !== undefined)
                            ret[k] = v2;
                    }));
            }
        });
        if (virtuals)
            Object.keys(this.schema.virtuals).forEach(k => k === 'id' || (ret[k] = this[k]));
        return Promise.all(promises)
            .then(() => ret);
    };
    schema.methods.getValues4Edit = function () {
        const ret = {
            info: {
                created: this.created || new Date(this._id.getTimestamp()),
                id: this.id
            },
            vars: this.jsonInfo(),
            specialOptions: {}
        };
        delete ret.vars.created;
        return ret;
    };
    schema.methods.getVar = function (k, req, forceTranslate = true) {
        const val = this.get(k);
        if (val === undefined)
            return Promise.resolve();
        const opt = schema.tree[k];
        const ret = [];
        const site = this.db.eucaDb.site;
        let info = null;
        // noinspection FallThroughInSwitchStatementJS
        switch (schema.getTypename(k)) {
            case 'Multilang':
                if (!val)
                    return Promise.resolve(val);
                const fn = forceTranslate ? 'getLangOrTranslate' : 'getLang';
                if (!Array.isArray(val))
                    return Promise.resolve(val[fn](req.ml.lang));
                return Promise.all(val.map(v => v[fn](req.ml.lang)));
            case 'Bdf':
                if (!val)
                    return Promise.resolve();
                info = val.info(req.maxImgWidth, req.maxImgHeight, req.imgCrop, req.imgnwm);
                info.uri = site.staticHost + info.uri;
                return Promise.resolve(info);
            case 'BdfList':
                if (!val || !Object.keys(val).length)
                    return Promise.resolve();
                Object.keys(val).forEach(i => {
                    if (val[i].info) {
                        info = val[i].info(req.maxImgWidth, req.maxImgHeight);
                        info.uri = site.staticHost + info.uri;
                        ret.push(info);
                    }
                });
                return Promise.resolve(ret);
            case 'Fs':
                if (!val || !Object.keys(val).length)
                    return Promise.resolve();
                Object.keys(val).forEach(i => {
                    if (val[i].info) {
                        info = val[i].info();
                        if (info instanceof Error)
                            return console.warn(info.stack);
                        info.id = val[i]._id;
                        info.uri = site.staticHost + info.uri;
                        if (info.versions)
                            Object.keys(info.versions).forEach(j => info.versions[j] = site.staticHost + info.versions[j]);
                        ret.push(info);
                    }
                });
                return Promise.resolve(ret.length ? ret : null);
            case 'MlSelector':
            case 'MlCheckboxes':
                return val ? val.getVal(req, this.db.eucaDb) : Promise.resolve();
            case 'location':
                return Promise.resolve(new Location(val));
            case 'Number':
                if (opt.origType === 'money')
                    return Promise.resolve(req.ml.money(val, opt.currency));
                if (opt.origType === 'selector')
                    return this.getName(k, req);
            case 'String':
                if (opt.formtype === 'selector' && opt.multilang)
                    return this.getName(k, req);
            case 'Date':
            case 'ObjectId':
            default:
                return Promise.resolve(val);
        }
    };
    schema.methods.jsonInfo = function (width, height, crop) {
        const ret = this.toJSON();
        ret._id = this._id.toString();
        ret.created = this.created || new Date(this._id.getTimestamp());
        delete ret.__v;
        this.schema.eachPath((k, path) => {
            switch (path.options.type) {
                case lib_1.LipthusSchemaTypes.Bdf:
                case lib_1.LipthusSchemaTypes.BdfList:
                    if (this[k]) {
                        if (!this[k].info)
                            console.error(new Error('Schema BdfList. Wrong object: ' + this[k].constructor.name));
                        else
                            ret[k] = this[k].info(width, height, crop);
                    }
                    break;
                case lib_1.LipthusSchemaTypes.Fs:
                    if (this[k])
                        ret[k] = this[k].info();
                    break;
                case lib_1.LipthusSchemaTypes.MlSelector:
                case lib_1.LipthusSchemaTypes.MlCheckboxes:
                    // jj 21/10/14. No he encontrado mejor forma de solucionar que toJSON devuelve 'nationality'
                    if (path.options.origType === 'nationality') {
                        if (this[k])
                            ret[k] = this[k].val;
                    }
                    else 
                    // old compatibility
                    if (ret[k] && ret[k].val)
                        ret[k] = ret[k].val;
                    break;
                // default:
                // 	if(Array.isArray(path.options.type) && ret[k] && !ret[k].length)
                // 		delete ret[k];
            }
        });
        return ret;
    };
    schema.methods.jsonInfoIncFiles = function () {
        return this.loadFiles().then(() => this.jsonInfo());
    };
    schema.methods.setCasted = function (v) {
        Object.keys(v).forEach(k => {
            if (!schema.paths[k])
                return console.error('Field ' + k + ' not found in schema ' + schema.options.collection);
            switch (this.schema.paths[k].options.type) {
                case lib_1.LipthusSchemaTypes.Bdf:
                    v[k] = bdf_1.BinDataFile.fromMongo(v[k], {
                        collection: this.collection.name,
                        id: this._id,
                        field: k
                    });
                    break;
                case lib_1.LipthusSchemaTypes.BdfList:
                    Object.keys(v[k]).forEach(i => {
                        v[k][i] = bdf_1.BinDataFile.fromMongo(v[k][i], {
                            collection: this.collection.name,
                            id: this._id,
                            field: k + '.' + i
                        });
                    });
                    break;
                case lib_1.LipthusSchemaTypes.MlSelector:
                    if (typeof v[k] === 'object')
                        v[k] = v[k].val;
                    break;
            }
            this[k] = v[k];
        });
        return this;
    };
    schema.methods.getTitle = function (lang) {
        const identifier = this.schema.options.identifier || 'title';
        const ret = this[identifier];
        if (typeof ret !== 'object')
            return ret;
        lang = lang || 'es';
        return ret[lang] || ret.es || ret[Object.keys(ret)[0]];
    };
    schema.methods.getDBRef = function () {
        return new lib_1.DBRef(this.schema.get('collection'), this._id, this.db.name);
    };
    schema.methods.getCaptions = function (req) {
        const ret = {};
        const toGet = {};
        this.schema.eachPath((k) => {
            ret[k] = schema.tree[k].caption;
            if (!ret[k])
                ret[k] = k;
            else if (req.ml.all[ret[k]])
                ret[k] = req.ml.all[ret[k]];
            else
                toGet[ret[k]] = k;
        });
        const keysToGet = Object.keys(toGet);
        if (!keysToGet.length)
            return Promise.resolve(ret);
        return req.db.lang
            .find({ _k: { $in: keysToGet } }, '_k ' + req.ml.lang)
            .then((r) => {
            r.forEach(t => ret[toGet[t._k]] = t.get(req.ml.lang));
            return ret;
        });
    };
    schema.methods.things4show = function (req, opt) {
        opt = opt || {};
        return this.loadFiles()
            .then(() => this.getValues(req))
            .then((values) => this.getCaptions(req)
            .then((captions) => {
            const ret = { _id: null };
            Object.each(values, (k, v) => {
                ret[k] = {
                    caption: captions[k]
                };
                // l(k, schema.getTypename(k))
                switch (schema.getTypename(k)) {
                    case 'BdfList':
                    case 'Fs':
                        if (v) {
                            v.forEach((bdfInfo, i) => v[i] = '<div class="thumb-container">'
                                + bdfInfo.getThumb(opt.width || 150, opt.height || 150, false, true)
                                    .toHtml() + '</div>');
                            v = v.join('');
                        }
                        break;
                    case 'Bdf':
                        if (v)
                            v = '<div class="thumb-container">'
                                + v.getThumb(opt.width || 150, opt.height || 150, false, true)
                                    .toHtml() + '</div>';
                        break;
                    case "Boolean":
                        v = v ? '&#x2713;' : '&#x2717;';
                        break;
                    case 'MlCheckboxes':
                        v = v && v.join(', ');
                        break;
                    case 'Mixed':
                        v = JSON.stringify(v);
                        break;
                    case 'Date':
                        v = v && v.toUserDatetimeString();
                        break;
                }
                ret[k].value = v;
            });
            return ret;
        }))
            .then((ret) => {
            // populate user fields
            return new Promise((ok, ko) => {
                const userFields = [];
                this.schema.eachPath((k, path) => path.options.ref === 'user' && userFields.push(k));
                this.populate(userFields.join(' '), 'uname', (err) => {
                    if (err)
                        return ko(err);
                    userFields.forEach(k => {
                        const user = this.get(k);
                        if (user)
                            ret[k].value = user.htmlLink();
                    });
                    ok(ret);
                });
            });
        });
    };
    /**
     * Ensures all multilang vars values for an specific language
     * @param lang
     * @returns {Promise.<*>}
     */
    schema.methods.ensureLang = function (lang) {
        const prom = [];
        schema.eachPath((path, type) => {
            if (type.instance === 'Multilang' && this[path] && this[path][lang])
                prom.push(this[path].getLangOrTranslate(lang));
        });
        return Promise.all(prom);
    };
    // events
    schema.pre('init', function (obj) {
        schema.eachPath((k, v) => {
            switch (schema.getTypename(k)) {
                case 'BdfList':
                case 'Bdf':
                case 'Fs':
                    v.id = obj._id;
                    v.collection = schema.get('name');
                    v.dbname = this.db.name;
                    break;
                case 'Multilang':
                    if (schema.tree[k].constructor.name === 'Array' && obj[k]) {
                        const MlText = lib_1.LipthusSchemaTypes.MultilangText;
                        obj[k].forEach((o, i) => obj[k][i] = new MlText(o, this.collection, k + '.' + i, obj._id, this.db.eucaDb.site));
                    }
                    break;
            }
        });
    });
    if (!schema.options.toObject)
        schema.options.toObject = {};
    schema.options.toObject.transform = (doc, ret) => {
        schema.eachPath((k, path) => {
            if (!doc.isSelected(k))
                return;
            switch (path.options.type) {
                case lib_1.LipthusSchemaTypes.MlSelector:
                case lib_1.LipthusSchemaTypes.MlCheckboxes:
                    ret[k] = ret[k] && ret[k].val;
                    break;
                case lib_1.LipthusSchemaTypes.BdfList:
                    ret[k] = ret[k] && ret[k].toObject();
                    break;
            }
        });
    };
}
exports.schemaGlobalMethods = schemaGlobalMethods;
