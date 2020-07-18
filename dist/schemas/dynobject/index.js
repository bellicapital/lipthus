"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../../lib");
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
            if (this.schema.options.schemas)
                return this.schema.options.schemas;
            this.schema.options.schemas = {};
            const arr = await this.find();
            arr.forEach(o => {
                const schema = DoSchema.fromModel(o);
                this.schema.options.schemas[schema.options.name] = schema;
            });
            return this.schema.options.schemas;
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
        }
    };
    return s;
};
