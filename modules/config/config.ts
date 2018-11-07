import {ConfigVarInstance} from "./configvar";
import {Site} from "../site";
import {BinDataImage} from "../bdi";
import {MultilangText} from "../schema-types/mltext";
import {ConfigModel, ConfigDoc} from "../../schemas/config";
import * as Debug from "debug";

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const debug = Debug('site:config');

export class Config {
	[key: string]: any;

	adminmail?: string;
	external_protocol = 'https';
	fb_app_id?: string;
	googleApiKey?: string;
	googleSecret?: string;
	host = '';
	language = 'es';
	port?: number;
	protocol = 'http';
	site_credentials?: boolean;
	sitelogo?: BinDataImage;
	sitename?: string;
	siteversion!: string;
	slogan?: MultilangText;
	startpage = 'home';
	static_host?: string;
	version!: string;
	webmastermail?: string;
	model: ConfigModel | any = {};
	lang_subdomains?: boolean;
	auto_hreflang?: boolean;

	constructor(public site: Site) {
		this.groups = {};
		this.configs = {};
	}

	load() {
		this.model = this.site.db.model('config');

		return this.checkDefaults()
			.then(() => this.model.find())
			.then((obj: Array<ConfigDoc>) => {
				const indb: {[s: string]: ConfigDoc} = {};
				const keys: Array<string> = ['datatype', 'title', 'value', 'desc', 'formtype', 'options'];

				obj.forEach(c => indb[c.get('name')] = c);

				const configs: any = require(this.site.lipthusDir + '/configs/configs');

				configs.general.configs.version[2] = this.site.cmsPackage.version;

				Object.each(configs, (group_name, group) => {
					this.groups[group_name] = {title: group.title, configs: {}};

					Object.each(group.configs, (key: string, c: Array<any>) => {
						const g: any = {group: group_name, name: key};

						c.forEach((v: any, idx) =>
								g[keys[idx]] = v);

						if (indb[key]) {
							g.value = indb[key].getValue();
							g._id = indb[key]._id;
						}

						this.configs[key] = ConfigVarInstance(g, this.site);

						if (!indb[key]) {
							indb[key] = new this.model({name: key, value: this.configs[key].value});

							indb[key].save()
								.catch(console.error.bind(console));

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
			})
			.then(() => this.check());
	}

	// noinspection JSUnusedLocalSymbols
	get(k: string, update?: any, cb = (v: any) => {}) {
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

	set(k: string, v: any, ns?: string | boolean | null, save?: boolean): any {
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

		const update: any = {};
		let key = 'value';

		if (ns)
			key += '.' + ns;

		update[key] = v;

		return this.model.updateOne(
			{name: this.configs[k].name},
			update,
			{upsert: true}
		);
	}

	getConfigsByCat(cat: string) {
		return this.groups[cat].configs;
	}

	getValuesByCat(cat: string) {
		const ret: any = {};

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

	checkDefaults() {
		return this.model.countDocuments({})
			.then((c: number) => {
				if (c)
					return;

				debug('Inserting config collection default values');

				return exec('mongorestore -d ' + this.site.db.name + ' -c config ' + this.site.lipthusDir + '/configs/config.bson')
					.then((r: { stdout: string, stderr: string }) =>
						this.model.countDocuments({})
							.then((c2: number) => {
								if (c2)
									return;

								if (r.stderr)
									throw new Error(r.stderr);
							})
					);
			});
	}
}
