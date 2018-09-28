import {BinDataFile, MultilangText} from "../modules";
import {LipthusSchema} from "../lib";
import {Document, Model, Types} from "mongoose";

namespace LipthusSettings {
	export const name = 'settings';
	const s = new LipthusSchema({
		name: {type: String, unique: true},
		type: String,
		value: {
			type: LipthusSchema.Types.Mixed, noWatermark: true, get: function (this: any, val: any): any {
				//noinspection JSUnresolvedVariable
				if (val && val.MongoBinData) { //noinspection JSUnresolvedFunction,JSUnresolvedVariable,JSPotentiallyInvalidUsageOfThis
					return BinDataFile.fromMongo(val, {collection: 'settings', id: this._id, field: 'value'});
				}

				return val;
			}
		}
	}, {
		collection: 'settings',
		identifier: 'name'
	});

	export class SettingMethods {

		getValue(this: any, lang?: string) {
			//noinspection JSUnresolvedVariable
			switch (this.type) {
				case 'ml':
					//noinspection JSUnresolvedFunction
					return new MultilangText(
						this.value,
						this.collection,
						'value', this._id,
						this.db.eucaDb.site
					)
						.getLangOrTranslate(lang);
				case 'bdi':
					//noinspection JSUnresolvedVariable
					return Promise.resolve(this.value && this.value.info());
				case 'string':
				case 'boolean':
				default:
					return Promise.resolve(this.value);
			}
		}
	}

	export class SettingStatics {
		getValues(this: any, lang?: string, query?: any) {
			const ret: any = {};

			return this.find(query)
				.then((settings: Array<any>) => Promise.all(
					settings.map(st => ret[st.name] = st.getValue(lang).then((v: any) => ret[st.name] = v))
				))
				.then(() => ret);
		}

		getValue(this: any, key: string, lang?: string) {
			return this.findOne({name: key})
				.then((st?: any) => st && st.getValue(lang));
		}

		setValue(this: any, key: string, value: any, type?: string) {
			const update: any = {value: value};

			if (type) {
				update.type = type;

				if (value && type === 'ObjectId')
					update.value = Types.ObjectId(value);
			}

			return this.updateOne({name: key}, update, {upsert: true});
		}
	}

	const methods: any = SettingMethods.prototype;
	Object.getOwnPropertyNames(methods).filter(pn => pn !== 'constructor').forEach(k => s.methods[k] = methods[k]);

	const statics: any = SettingStatics.prototype;
	Object.getOwnPropertyNames(statics).filter(pn => pn !== 'constructor').forEach(k => s.statics[k] = statics[k]);

	export function getSchema() {
		return s;
	}

	export interface Setting extends Document, SettingMethods {
	}

	export interface SettingModel extends Model<Setting>, SettingStatics {
	}
}

export = LipthusSettings;
