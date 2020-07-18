import {ConfigVar, ConfigVarInstance} from "./configvar";
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

	groups: { [key: string]: { title: string; configs: { [configKey: string]: ConfigVar }; } } = {};
	configs: { [configKey: string]: ConfigVar } = {};
	adminmail?: string;
	allow_register?: boolean;
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
	static_host?: string;
	version!: string;
	webmastermail?: string;
	model: ConfigModel | any = {};
	lang_subdomains?: boolean;
	auto_hreflang?: boolean;
	sessionExpireDays?: number;
	sitemap: boolean;
	logRoute: boolean;

	constructor(public site: Site) {
	}

	async load() {
		this.model = this.site.db.model('config');

		const obj: Array<ConfigDoc> = await this.checkDefaults()
			.then(() => this.model.find());

		const inDb: { [s: string]: ConfigDoc } = {};
		const keys: Array<string> = ['datatype', 'title', 'value', 'desc', 'formtype', 'options'];

		obj.forEach(c => inDb[c.get('name')] = c);

		const configs: any = require(this.site.lipthusDir + '/configs/configs');

		configs.general.configs.version[2] = this.site.cmsPackage.version;

		Object.each(configs, (group_name, group) => {
			this.groups[group_name] = {title: group.title, configs: {}};

			Object.each(group.configs, (key: string, c: Array<any>) => {
				const g: any = {group: group_name, name: key};

				c.forEach((v: any, idx) =>
					g[keys[idx]] = v);

				if (inDb[key]) {
					g.value = inDb[key].getValue();
					g._id = inDb[key]._id;
				}

				this.configs[key] = ConfigVarInstance(g, this.site);

				if (!inDb[key]) {
					inDb[key] = new this.model({name: key, value: this.configs[key].value});

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

		this.model.on('itemChange', (item: any) => {
			this.configs[item.name].setValue(item.value);
		});

		await this.check();
	}

	// noinspection JSUnusedLocalSymbols
	async get(k: string, update = false) {
		if (update) {
			const obj = await this.model.findOne({name: k});

			if (!obj) return {error: 'Config ' + k + ' not found'};

			if (!this.configs[k])
				console.error(new Error('Config ' + k + ' does not exists'));
			else
				this.configs[k].setValue(obj.value);
		}

		return this.configs[k].value;
	}

	set(k: string, v: any, ns?: string | true, save?: boolean): any {
		if (ns === true)
			save = true;

		const _ns: string | undefined = ns === true ? undefined : ns;

		if (!_ns) {
			this[k] = v;
			v = this[k];
		} else
			(this[k] as any)[_ns] = v;

		if (!save)
			return Promise.resolve();

		const update: any = {};
		let key = 'value';

		if (_ns)
			key += '.' + _ns;

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

	metaRobots() {
		return this.configs.meta_robots.options[this.configs.meta_robots.value];
	}

	async check() {
		this.configs.languages.value.forEach((code: string, idx: number) => {
			if (!code)
				this.configs.languages.value.splice(idx, 1);
		});
	}

	async checkDefaults() {
		const c: number = await this.model.countDocuments({});

		if (c)
			return;

		debug('Inserting config collection default values');

		const r: { stdout: string, stderr: string } = await exec('mongorestore --uri="' + this.site.db.connectParams().uri + '" -d ' + this.site.db.name
			+ ' -c config ' + this.site.lipthusDir + '/configs/config.bson');

		const c2: number = await this.model.countDocuments({});

		if (!c2 && r.stderr)
			throw new Error(r.stderr);
	}
}
