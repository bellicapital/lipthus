import {LipthusSchema} from "../lib";
import {BinDataFile, Site} from '../modules';
import {Document, Model} from "mongoose";

const debug = require("debug")('site:config');

let definitions: any;
const groupsByKey: any = {};


export const name = 'config';

export function getSchema(site: Site) {
	if (!definitions) {
		definitions = require(site.lipthusDir + '/configs/configs');

		Object.keys(definitions).forEach((group) => Object.keys(definitions[group].configs).forEach(key => groupsByKey[key] = group));
	}

	const s = new LipthusSchema({
		name: {type: String, unique: true},
		value: {
			type: LipthusSchema.Types.Mixed
		}
	}, {collection: 'config'});

	s.methods = {
		getValue: function (this: any) {
			const val = this.get('value');
			const key = this.get('name');
			const definition = definitions[groupsByKey[key]];

			if (!definition) {
				debug('Deleting not defined Config ' + key);

				return this.collection.remove({_id: this._id}).catch(console.error.bind(console));
			}

			if (definition.configs[key][0] === 'bdf' && val)
				return BinDataFile.fromMongo(val, {collection: 'config', id: this._id, field: 'value'});

			return val;
		}
	};

	/**
	 * @param key
	 * @param value
	 * @returns {Promise|Promise.<{}>|*}
	 */
	s.statics.changeValue = function (this: any, key: string, value: any) {
		return this.updateOne({name: key}, {$set: {value: value}})
			.then(() => this.db.lipthusDb.site.config[key] = value);
	};

	return s;
}

export interface ConfigDoc extends Document {
	query: string;
	created?: Date;
	name: string;
	value: any;

	getValue: () => any;
}

export interface ConfigModel extends Model<ConfigDoc> {

}
