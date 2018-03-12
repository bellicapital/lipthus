import {ConfigVarInstance} from "./configvar";
import {Site} from "../site";

export class Config {
	[key: string]: any;
	
	constructor(site: Site) {
		this.groups = {};
		this.configs = {};
		this.site = site;
		this.model = site.db.model('config');
	}
	
	load() {
		return this.model.find()
			.then((obj: Array<any>) => {
				const indb = {};
				const keys = ['datatype', 'title', 'value', 'desc', 'formtype', 'options'];
				
				obj.forEach(c => indb[c.name] = c);
				
				const configs = require(this.site.lipthusDir + '/configs/configs');
				
				configs.general.configs.version[2] = this.site.cmsPackage.version;
				
				Object.each(configs, (group_name, group) => {
					this.groups[group_name] = {title: group.title, configs: {}};
					
					Object.each(group.configs, (key, c) => {
						const g: any = {group: group_name, name: key};
						
						Object.each(c, (k, v) => g[keys[k]] = v);
						
						if (indb[key]) {
							g.value = indb[key].value;
							g._id = indb[key]._id;
						}
						
						this.configs[key] = ConfigVarInstance(g, this.site);
						
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
				
				this.model.on('itemChange', (item: any) => {
					this.configs[item.name].setValue(item.value);
				});
				
				return this.check().then(() => this);
			});
	}
	
	// noinspection JSUnusedLocalSymbols
	get(k: string, update: any, cb = (v: any) => {
	}) {
		
		if (update) {
			this.model.findOne({name: k}, (err: Error, obj: any) => {
				if (err) return cb(err);
				
				if (!obj) return cb({error: 'Config ' + k + ' not found'});
				
				if (!this.configs[k])
					console.error(new Error('Config ' + k + ' does not exists'));
				else
					this.configs[k].setValue(obj.value);
				
				cb.call(this.configs[k], this.configs[k].value);
			});
		} else {
			cb.call(this.configs[k], this.configs[k].value);
			
			return this.configs[k].value;
		}
	}
	
	set(k: string, v: any, ns: boolean | null, save: boolean) {
		if (ns === true) {
			ns = null;
			save = true;
		}
		
		if (!ns) {
			this[k] = v;
			v = this[k];
		} else
			this[k][ns] = v;
		
		if (!save)
			return Promise.resolve();
		
		const update = {};
		let key = 'value';
		
		if (ns)
			key += '.' + ns;
		
		update[key] = v;
		
		return this.model.update(
			{name: this.configs[k].name},
			update,
			{upsert: true}
		);
	}
	
	getConfigsByCat(cat: string) {
		return this.groups[cat].configs;
	}
	
	getValuesByCat(cat: string) {
		const ret = {};
		
		Object.each(this.groups[cat].configs, (k, c) => ret[k] = c.value);
		
		return ret;
	}
	
	metaRobots(cb?: (a: any) => {}) {
		if (!cb)
			return this.configs.meta_robots.options[this.configs.meta_robots.value];
		
		this.get('meta_robots', true, () => cb(this.metaRobots()));
	}
	
	check() {
		return new Promise(ok => {
			this.configs.languages.value.forEach((code: string, idx: number) => {
				if (!code)
					this.configs.languages.value.splice(idx, 1);
			});
			
			return ok();
		});
	}
}
