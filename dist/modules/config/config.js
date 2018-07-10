"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const configvar_1 = require("./configvar");
const Debug = require("debug");
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const debug = Debug('site:config');
class Config {
    constructor(site) {
        this.site = site;
        this.external_protocol = 'https';
        this.host = '';
        this.language = 'es';
        this.protocol = 'http';
        this.startpage = 'home';
        this.model = {};
        this.groups = {};
        this.configs = {};
    }
    load() {
        this.model = this.site.db.model('config');
        return this.checkDefaults()
            .then(() => this.model.find())
            .then((obj) => {
            const indb = {};
            const keys = ['datatype', 'title', 'value', 'desc', 'formtype', 'options'];
            obj.forEach((c) => indb[c.get('name')] = c);
            const configs = require(this.site.lipthusDir + '/configs/configs');
            configs.general.configs.version[2] = this.site.cmsPackage.version;
            Object.each(configs, (group_name, group) => {
                this.groups[group_name] = { title: group.title, configs: {} };
                Object.each(group.configs, (key, c) => {
                    const g = { group: group_name, name: key };
                    c.forEach((v, idx) => g[keys[idx]] = v);
                    if (indb[key]) {
                        g.value = indb[key].get('value');
                        g._id = indb[key]._id;
                    }
                    this.configs[key] = configvar_1.ConfigVarInstance(g, this.site);
                    if (!indb[key]) {
                        indb[key] = new this.model({ name: key, value: this.configs[key].value });
                        indb[key].save();
                        this.configs[key]._id = indb[key]._id;
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
        })
            .then(() => this.check());
    }
    // noinspection JSUnusedLocalSymbols
    get(k, update, cb = (v) => {
    }) {
        if (update) {
            this.model.findOne({ name: k }, (err, obj) => {
                if (err)
                    return cb(err);
                if (!obj)
                    return cb({ error: 'Config ' + k + ' not found' });
                if (!this.configs[k])
                    console.error(new Error('Config ' + k + ' does not exists'));
                else
                    this.configs[k].setValue(obj.value);
                cb.call(this.configs[k], this.configs[k].value);
            });
        }
        else {
            cb.call(this.configs[k], this.configs[k].value);
            return this.configs[k].value;
        }
    }
    set(k, v, ns, save) {
        if (ns === true) {
            ns = null;
            save = true;
        }
        if (!ns) {
            this[k] = v;
            v = this[k];
        }
        else
            this[k][ns] = v;
        if (!save)
            return Promise.resolve();
        const update = {};
        let key = 'value';
        if (ns)
            key += '.' + ns;
        update[key] = v;
        return this.model.update({ name: this.configs[k].name }, update, { upsert: true });
    }
    getConfigsByCat(cat) {
        return this.groups[cat].configs;
    }
    getValuesByCat(cat) {
        const ret = {};
        Object.each(this.groups[cat].configs, (k, c) => ret[k] = c.value);
        return ret;
    }
    metaRobots(cb) {
        if (!cb)
            return this.configs.meta_robots.options[this.configs.meta_robots.value];
        this.get('meta_robots', true, () => cb(this.metaRobots()));
    }
    check() {
        return new Promise(ok => {
            this.configs.languages.value.forEach((code, idx) => {
                if (!code)
                    this.configs.languages.value.splice(idx, 1);
            });
            return ok();
        });
    }
    checkDefaults() {
        return this.model.count({})
            .then((c) => {
            if (c)
                return;
            debug('Inserting config collection default values');
            return exec('mongorestore -d ' + this.site.db.name + ' -c config ' + this.site.lipthusDir + '/configs/config.bson')
                .then((r) => this.model.count({})
                .then((c2) => {
                if (c2)
                    return;
                if (r.stderr)
                    throw new Error(r.stderr);
            }));
        });
    }
}
exports.Config = Config;
