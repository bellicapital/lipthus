"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LipthusSchemaTypes = exports.SchemaTypes = exports.LipthusSchema = void 0;
const mongoose = require("mongoose");
const mongoose_1 = require("mongoose");
require("./query");
const schema_plugins_1 = require("../modules/schema-plugins");
const mls = require("../modules/schema-types/mlselector");
const mlBdf = require("../modules/schema-types/bdf");
const mlBdfL = require("../modules/schema-types/bdf-list");
const mlFs = require("../modules/schema-types/fs");
const mltext_1 = require("../modules/schema-types/mltext");
const mlcheckboxes_1 = require("../modules/schema-types/mlcheckboxes");
const plugins = {
    lastMod: schema_plugins_1.lastModifiedPlugin,
    created: schema_plugins_1.createdPlugin,
    submitter: schema_plugins_1.submitterPlugin,
    modifier: schema_plugins_1.modifierPlugin,
    location: schema_plugins_1.locationPlugin,
    lastActivated: schema_plugins_1.lastActivated,
    removed: schema_plugins_1.removedPlugin
};
class LipthusSchema extends mongoose_1.Schema {
    constructor(obj, options = {}) {
        super(obj, options);
        this.options = options;
        if (!options.versionKey)
            options.versionKey = '__v';
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
        this.post('update', function () {
            // se activa para subdocumentos ('EmbeddedDocument')
            this.model.emit('itemUpdated', { conditions: this._conditions, update: this._compiledUpdate }, this);
        });
        this.post('remove', () => {
            // se activa para subdocumentos ('EmbeddedDocument')
            try {
                this.db.models[this.options.name].emit('itemRemoved', this);
            }
            catch (e) {
            }
        });
        this.pre('save', function (next) {
            this._changed = this.modifiedPaths();
            this._isNew = this.isNew;
            next();
        });
        this.post('save', function () {
            if (this._isNew) {
                // se activa para subdocumentos ('EmbeddedDocument')
                // noinspection JSPotentiallyInvalidUsageOfClassThis
                if (this.constructor && this.constructor.name !== 'model')
                    return;
                this.emit('created');
                delete this._isNew;
            }
            else if (this._changed && this._changed.length) {
                if (this._changed.indexOf('active') !== -1) {
                    this.emit(this.active ? 'itemActivated' : 'itemDeactivated');
                    if (this._changed.length !== 1)
                        this.emit('update', this._changed);
                }
                else
                    this.emit('update', this._changed);
            }
            delete this._changed;
        });
        this.post('init', (a) => this.eachPath(p => {
            try {
                if (a[p]) {
                    const path = this.path(p);
                    if (path && path.constructor && path.constructor.name === 'Multilang')
                        Object.defineProperty(a[p], '_id', { value: a._id });
                }
            }
            catch (e) {
            }
        }));
    }
}
exports.LipthusSchema = LipthusSchema;
LipthusSchema.Types = mongoose_1.Schema.Types;
mongoose.LipthusSchema = LipthusSchema;
var LipthusSchemaTypes;
(function (LipthusSchemaTypes) {
    LipthusSchemaTypes.ObjectId = LipthusSchema.Types.ObjectId;
    LipthusSchemaTypes.MlSelector = mls.MlSelector;
    LipthusSchemaTypes.MlCheckboxes = mlcheckboxes_1.MlCheckboxes;
    LipthusSchemaTypes.Bdf = mlBdf.Bdf;
    LipthusSchemaTypes.BdfList = mlBdfL.BdfList;
    LipthusSchemaTypes.Fs = mlFs.Fs;
    // noinspection JSUnusedGlobalSymbols
    LipthusSchemaTypes.FsList = mlFs.FsList;
    LipthusSchemaTypes.Multilang = mltext_1.MultilangType;
    LipthusSchemaTypes.MultilangText = mltext_1.MultilangText;
})(LipthusSchemaTypes = exports.LipthusSchemaTypes || (exports.LipthusSchemaTypes = {}));
/**
 * @deprecated (usado en cmjs-newsletter)
 * @type {LipthusSchema}
 */
mongoose.EucaSchema = LipthusSchema;
