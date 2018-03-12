import {LipthusSchema} from "../lib";
import {BinDataFile} from '../modules';
import {LipthusRequest} from "../index";
import {Document, Model} from "mongoose";

let definitions: any;
const groupsByKey = {};

function getDefinition(key: string) {
	if (!definitions[groupsByKey[key]]) {
		console.warn('Config ' + key + ' not defined');
		return [];
	}
	
	return definitions[groupsByKey[key]].configs[key];
}


export const name = 'config';

export function getSchema() {
	if (!definitions) {
		definitions = require('../configs/configs');
		
		Object.each(definitions, (group, d) => Object.each(d.configs, key => groupsByKey[key] = group));
	}
	
	const s = new LipthusSchema({
		name: {type: String, unique: true},
		value: {
			type: LipthusSchema.Types.Mixed, get: function (this: any, val: any) {
				if (this.name && getDefinition(this.name)[0] === 'bdf')
					return BinDataFile.fromMongo(val, {collection: 'config', id: this._id, field: 'value'});
				
				return val;
			}
		}
	}, {collection: 'config'});
	
	/**
	 * @param key
	 * @param value
	 * @returns {Promise|Promise.<{}>|*}
	 */
	s.statics.changeValue = function (this: any, key: string, value: any) {
		return this.update({name: key}, {$set: {value: value}})
			.then(() => this.db.eucaDb.site.config[key] = value);
	};
	
	return s;
}

export interface Config extends Document {
	query: string;
	created?: Date;
}

export interface ConfigModel extends Model<Config> {
	
	// noinspection JSUnusedLocalSymbols
	log(req: LipthusRequest, query: any): Promise<any>;
	
}
