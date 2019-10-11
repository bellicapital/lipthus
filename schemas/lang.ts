import {LipthusSchema} from "../lib";
import {Document, Model} from "mongoose";
import {MultilangText} from "../modules/schema-types/mltext";
import {promisify} from "util";

const exec = promisify(require('child_process').exec);

const exclude = {
	_id: false,
	_mod: false,
	_tag: false,
	__v: false,
	modified: false,
	created: false
};

const excludeAll = [
	'_id',
	'_mod',
	'_k',
	'_tag',
	'__v',
	'modified',
	'created'
];

export const name = 'lang';

export function getSchema() {
	const s = new LipthusSchema({
		_tag: {type: String, index: true},
		_k: {type: String, index: true, unique: true}
	}, {
		collection: 'lang',
		strict: false,
		id: false
	});

	const methods: any = LipthusLanguageMethods.prototype;
	Object.getOwnPropertyNames(methods).filter(pn => pn !== 'constructor').forEach(k => s.methods[k] = methods[k]);

	const statics: any = LipthusLanguageStatics.prototype;
	Object.getOwnPropertyNames(statics).filter(pn => pn !== 'constructor').forEach(k => s.statics[k] = statics[k]);

	return s;
}

export class LipthusLanguageMethods {

	values(this: LipthusLanguage) {
		const ret = this.toObject();

		excludeAll.forEach(n => delete (ret[n]));

		return ret;
	}
}

export class LipthusLanguageStatics {
	get(this: LipthusLanguageModel, n: string) {
		return this.findOne({_k: n});
	}

	getValues(this: LipthusLanguageModel, n: string) {
		return this.get(n)
			.then((r: any) => r && (r as any).values());
	}

	load(this: LipthusLanguageModel, tag: string, code: string) {
		const fields: any = {_id: false, _k: true};

		fields[code] = true;

		return this.find({_tag: tag}, fields);
	}

	async getMlTag(this: LipthusLanguageModel, tag: string | Array<string>) {
		if (typeof tag === 'string')
			return this.getMlTag_(tag);

		const ret = {};

		for (const t of tag) {
			const r = await this.getMlTag_(t);

			Object.assign(ret, r);
		}

		return ret;
	}

	async getMlTag_(this: LipthusLanguageModel, tag: string) {
		const r: any = await this.find({_tag: tag}, exclude);

		const ret: any = {};

		for (const obj of r) {
			ret[obj._k] = obj.toObject();

			delete ret[obj._k]._k;
		}

		return ret;
	}

	async check(this: LipthusLanguageModel) {

		const count = await this.countDocuments();

		if (count > 5) return;

		console.log('Inserting lang collection default values');

		const lipthusDb = (this.db as any).lipthusDb;

		await exec('mongorestore --uri="' + lipthusDb.connectParams().uri + '" -d ' + lipthusDb.name + ' -c lang ' + (this.db as any).lipthusDb.site.lipthusDir + '/configs/lang.bson');
	}
}

export interface LipthusLanguage extends Document, LipthusLanguageMethods {
	code: string;
	title: { [s: string]: MultilangText };
	getLangList: (lang: string) => { [code: string]: string };
}

export interface LipthusLanguageModel extends Model<LipthusLanguage>, LipthusLanguageStatics {
}
