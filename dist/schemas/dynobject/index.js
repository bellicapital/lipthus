"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../../lib");
const _ = require("underscore");
const DoSchema = require('./do');
module.exports = function dynobject() {
    const s = new lib_1.LipthusSchema({
        title: { type: lib_1.LipthusSchemaTypes.Multilang, caption: '_TITLE' },
        description: { type: lib_1.LipthusSchemaTypes.Multilang, formtype: 'textarea', caption: '_DESCRIPTION' },
        name: String,
        colname: String,
        tag: String,
        dynvars: {},
        identifier: { type: String, default: 'title' },
        descIdentifier: { type: String, default: 'description' },
        parents: {},
        accept: [],
        active: { type: Boolean, default: true, caption: '_ACTIVE' },
        image: { type: {}, caption: '_IMAGE' },
        baseurl: String,
        list_created: { type: Boolean, default: true },
        subscriptions: Boolean,
        rss: Boolean,
        showTranslate: Boolean,
        required_or: {},
        logUpdates: {},
        lang: { newItem: {} },
        list_order: { type: {}, default: { title: 1 } } // Ordenación predeterminada para los listados. Formato pe: {created: -1}
    }, {
        collection: 'dynobjects'
    });
    s.statics = {
        addSchemas: function () {
            return this.getSchemas()
                .then((schemas) => Object.each(schemas, (name, schema) => this.db.lipthusDb.schema(name, schema)));
        },
        getSchemas: async function () {
            const options = this.schema.options;
            if (options.schemas)
                return options.schemas;
            options.schemas = {};
            const arr = await this.find();
            arr.forEach(o => {
                const schema = DoSchema.fromModel(o);
                options.schemas[schema.options.name] = schema;
            });
            return options.schemas;
        },
        getKeys: function () {
            return Object.keys(s.get('schemas'));
        },
        schemas: function () {
            return s.get('schemas');
        },
        taggedKeys: function (tag) {
            const ret = [];
            const schemas = s.get('schemas');
            Object.keys(schemas).forEach(k => {
                if (schemas[k].options.tag === tag)
                    ret.push(k);
            });
            return ret;
        },
        getItemsArray: async function (req) {
            const ret = {};
            const obj = await this.find();
            ret.handlers = obj.map(o => o.getDynValues(req));
            const m = await req.site.db.dynobjectsmenu.find();
            ret.menus = m.map(menu => {
                const json = menu.jsonInfo();
                delete json.__v;
                return json;
            });
            return ret;
        },
        checkAll: function (req, cb) {
            const ret = { dynobjects: {} };
            this.find((err, dy) => {
                let count = 0;
                dy.forEach(d => {
                    req.db[d.colname].checkAll(req, (err2, r) => {
                        ret.dynobjects[d.colname] = r;
                        if (++count === dy.length)
                            cb(null, ret);
                    });
                });
            });
        }
    };
    s.methods = {
        getDynValues: function (req) {
            const ret = this.toObject();
            ret.id = ret._id;
            delete ret._id;
            delete ret.dynvars;
            ret.vars = req.db[ret.colname].getDefinitions();
            return ret;
        },
        getNodeTree: function (req, filter, levels = 1, incOrphans = true) {
            if (!filter)
                filter = [];
            else if (typeof filter === 'string')
                filter = filter.split(',');
            let models;
            if (incOrphans && this.accept.length) {
                models = this.accept.slice(0); // clone
                if (models.indexOf(this.colname) === -1)
                    models.unshift(this.colname);
            }
            else
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
            return Promise.all(models.map(colname => {
                const opt = { sort: {} };
                if (!req.db.schemas[colname].tree.title.multilang)
                    opt.sort.title = 1;
                else
                    opt.sort['title.' + req.ml.lang] = 1;
                const ret = [];
                return req.db[colname].find(query, '', opt)
                    .then((r) => Promise.all(r.map(obj => obj.getNodeData(req, levels, filter)
                    .then((nData) => ret.push(nData)))))
                    .then(() => ret);
            }));
        }
    };
    return s;
};
