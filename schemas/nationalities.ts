import {LipthusSchema, LipthusSchemaTypes} from "../lib";
import {LipthusRequest} from "../index";
import {KeyAny, KeyString} from "../interfaces/global.interface";
import {Document, Model} from "mongoose";
import {MultilangText} from "../modules/schema-types/mltext";

let cache: KeyAny = {};

export const name = 'nationalities';

// noinspection JSUnusedGlobalSymbols
export function getSchema() {
	const s = new LipthusSchema({
		code: String,
		title: LipthusSchemaTypes.Multilang,
		custom: Boolean // not a real country
	}, {
		collection: 'nationalities'
	});

	const methods: any = NationalitiesMethods.prototype;
	Object.getOwnPropertyNames(methods).filter(pn => pn !== 'constructor').forEach(k => s.methods[k] = methods[k]);

	const statics: any = NationalitiesStatics.prototype;
	Object.getOwnPropertyNames(statics).filter(pn => pn !== 'constructor').forEach(k => s.statics[k] = statics[k]);

	return s;
}

export interface Nationality extends Document, NationalitiesMethods {
	code: string;
	title: {[s: string]: MultilangText};
	custom: boolean;
}

export interface NationalitiesModel extends Model<Nationality>, NationalitiesStatics {
}

export class NationalitiesMethods {
}

export class NationalitiesStatics {

	getList(req: LipthusRequest, lang?: string) {
		const _lang = lang || req.ml.lang;

		const end = () => {
			if (lang === req.ml.lang && !req.nationalities)
				Object.defineProperty(req, 'nationalities', {value: cache[_lang]});

			return cache[_lang];
		};

		if (cache[_lang])
			return Promise.resolve(end());

		return this.getLangList(_lang)
			.then((list: any) => {
				cache[_lang] = list;

				return end();
			});
	}

	getLangList(lang: string) {
		const sort: any = {};
		const list: KeyString = {};

		sort['title.' + lang] = 1;

		return (this as any).find()
			.sort(sort)
			.then((r: Array<any>) => r.map(t => t.title
				.getLangOrTranslate(lang)
				.then((name2: string) => list[t.code] = name2)
			))
			.then((p: Array<any>) => Promise.all(p))
			.then(() => list);
	}

	setVal(code: string, lang: string, value: string) {
		const update = {$set: <any>{}};

		update.$set["title." + lang] = value;

		return (this as any).updateNative({code: code}, update, {upsert: true})
			.then((r: any) => {
				if (!r.result || !(r.result.nModified || r.result.upserted))
					return false;

				cache = {};

				return true;
			});
	}
}
