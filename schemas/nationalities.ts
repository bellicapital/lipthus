import {LipthusSchema, LipthusSchemaTypes} from "../lib";
import {LipthusRequest} from "../index";
import {KeyString} from "../interfaces/global.interface";
import {Document, Model} from "mongoose";
import {MultilangText} from "../modules/schema-types/mltext";

export const name = 'nationalities';

// noinspection JSUnusedGlobalSymbols
export function getSchema() {
	const s = new LipthusSchema({
		code: String,
		title: LipthusSchemaTypes.Multilang
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
	title: { [s: string]: MultilangText };
	getLangList: (lang: string) => { [code: string]: string };
}

export interface NationalitiesModel extends Model<Nationality>, NationalitiesStatics {
}

export class NationalitiesMethods {
}

export class NationalitiesStatics {

	getList(this: NationalitiesModel, req: LipthusRequest, lang?: string) {
		const _lang = lang || req.ml.lang;

		return this.getLangList(_lang);
	}

	getLangList(this: NationalitiesModel, lang: string) {
		const sort: any = {};
		const list: KeyString = {};

		sort['title.' + lang] = 1;

		// noinspection TypeScriptValidateJSTypes
		return this.find()
			.collation({locale: lang})
			.sort(sort)
			.then((r: Array<any>) => r.map(t => t.title && t.title
				.getLangOrTranslate(lang)
				.then((name2: string) => list[t.code] = name2)
			))
			.then((p: Array<any>) => Promise.all(p))
			.then(() => list);
	}

	// noinspection JSUnusedGlobalSymbols
	setVal(code: string, lang: string, value: string) {
		const update = {$set: <any>{}};

		update.$set["title." + lang] = value;

		return (this as any).updateOne({code: code}, update, {upsert: true})
			.then((r: any) => !(!r.result || !(r.result.nModified || r.result.upserted)));
	}
}
