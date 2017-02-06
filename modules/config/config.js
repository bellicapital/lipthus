"use strict";

const ConfigVar = require('./configvar');

class Config {
	constructor(site) {
		this.groups = {};
		this.configs = {};
		this.site = site;
		this.model = site.db.model('config');
	}

	load() {
		return this.model.find()
			.then(obj => {
				const indb = {};
				const keys = ['datatype', 'title', 'value', 'desc', 'formtype', 'options'];

				obj.forEach(c => indb[c.name] = c);

				const configs = require('../../configs/configs');

				configs.general.configs.version[2] = this.site.cmsPackage.version;

				Object.each(configs, (group_name, group) => {
					this.groups[group_name] = {title: group.title, configs: {}};

					Object.each(group.configs, (key, c) => {
						const g = {group: group_name, name: key};

						Object.each(c, (k, v) => g[keys[k]] = v);

						if (indb[key]) {
							g.value = indb[key].value;
							g._id = indb[key]._id;
						}

						this.configs[key] = ConfigVar(g, this.site);

						if (!indb[key]) {
							indb[key] = new this.model({name: key, value: this.configs[key].value});
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

				this.model.on('itemChange', item => {
					this.configs[item.name].setValue(item.value);
				});

				return this.check().then(() => this);
			});
	}

	get(k, update, cb) {
		cb = cb || function () {
			};

		if (update) {
			this.model.findOne({name: k}, (err, obj) => {
				if (err) return cb(err);

				if (!obj) return cb({error: 'Config ' + k + ' not found'});

				if (!this.configs[k])
					this.configs[k] = new ConfigVar(obj);
				else
					this.configs[k].setValue(obj.value);

				cb.call(this.configs[k], this.configs[k].value);
			});
		} else {
			cb.call(this.configs[k], this.configs[k].value);

			return this.configs[k].value;
		}
	}

	set(k, v, ns, save) {
		if(ns === true){
			ns = null;
			save = true;
		}

		if(!ns) {
			this[k] = v;
			v = this[k];
		} else
			this[k][ns] = v;

		if (!save)
			return Promise.resolve();

		const update = {};
		let key = 'value';

		if(ns)
			key += '.' + ns;

		update[key] = v;

		return this.model.update(
			{name: this.configs[k].name},
			update,
			{upsert: true}
		);
	}

	jQueryUITheme() {
		return this.configs.jqueryui_theme && this.configs.jqueryui_theme.value || 'smoothness';
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

		this.get('meta_robots', true, () => {
			cb(this.metaRobots());
		});
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
}


module.exports = Config;