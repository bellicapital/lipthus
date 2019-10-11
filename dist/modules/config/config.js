"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const configvar_1 = require("./configvar");
const Debug = require("debug");
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const debug = Debug('site:config');
class Config {
    constructor(site) {
        this.site = site;
        this.groups = {};
        this.configs = {};
        this.external_protocol = 'https';
        this.host = '';
        this.language = 'es';
        this.protocol = 'http';
        this.model = {};
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            this.model = this.site.db.model('config');
            const obj = yield this.checkDefaults()
                .then(() => this.model.find());
            const inDb = {};
            const keys = ['datatype', 'title', 'value', 'desc', 'formtype', 'options'];
            obj.forEach(c => inDb[c.get('name')] = c);
            const configs = require(this.site.lipthusDir + '/configs/configs');
            configs.general.configs.version[2] = this.site.cmsPackage.version;
            Object.each(configs, (group_name, group) => {
                this.groups[group_name] = { title: group.title, configs: {} };
                Object.each(group.configs, (key, c) => {
                    const g = { group: group_name, name: key };
                    c.forEach((v, idx) => g[keys[idx]] = v);
                    if (inDb[key]) {
                        g.value = inDb[key].getValue();
                        g._id = inDb[key]._id;
                    }
                    this.configs[key] = configvar_1.ConfigVarInstance(g, this.site);
                    if (!inDb[key]) {
                        inDb[key] = new this.model({ name: key, value: this.configs[key].value });
                        inDb[key].save()
                            .catch(console.error.bind(console));
                        this.configs[key]._id = inDb[key]._id;
                    }
                    this.groups[group_name].configs[key] = this.configs[key];
                    Object.defineProperty(this, key, {
                        get: () => this.configs[key].getValue(),
                        set: v => this.configs[key].setValue(v)
                    });
                });
            });
            this.model.on('itemChange', (item) => {
                this.configs[item.name].setValue(item.value);
            });
            yield this.check();
        });
    }
    // noinspection JSUnusedLocalSymbols
    get(k, update = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (update) {
                const obj = yield this.model.findOne({ name: k });
                if (!obj)
                    return { error: 'Config ' + k + ' not found' };
                if (!this.configs[k])
                    console.error(new Error('Config ' + k + ' does not exists'));
                else
                    this.configs[k].setValue(obj.value);
            }
            return this.configs[k].value;
        });
    }
    set(k, v, ns, save) {
        if (ns === true)
            save = true;
        const _ns = ns === true ? undefined : ns;
        if (!_ns) {
            this[k] = v;
            v = this[k];
        }
        else
            this[k][_ns] = v;
        if (!save)
            return Promise.resolve();
        const update = {};
        let key = 'value';
        if (_ns)
            key += '.' + _ns;
        update[key] = v;
        return this.model.updateOne({ name: this.configs[k].name }, update, { upsert: true });
    }
    getConfigsByCat(cat) {
        return this.groups[cat].configs;
    }
    getValuesByCat(cat) {
        const ret = {};
        Object.each(this.groups[cat].configs, (k, c) => ret[k] = c.value);
        return ret;
    }
    metaRobots() {
        return this.configs.meta_robots.options[this.configs.meta_robots.value];
    }
    check() {
        return __awaiter(this, void 0, void 0, function* () {
            this.configs.languages.value.forEach((code, idx) => {
                if (!code)
                    this.configs.languages.value.splice(idx, 1);
            });
        });
    }
    checkDefaults() {
        return __awaiter(this, void 0, void 0, function* () {
            const c = yield this.model.countDocuments({});
            if (c)
                return;
            debug('Inserting config collection default values');
            const r = yield exec('mongorestore --uri="' + this.site.db.connectParams().uri + '" -d ' + this.site.db.name
                + ' -c config ' + this.site.lipthusDir + '/configs/config.bson');
            const c2 = yield this.model.countDocuments({});
            if (!c2 && r.stderr)
                throw new Error(r.stderr);
        });
    }
}
exports.Config = Config;
