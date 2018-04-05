import {Document, Model} from 'mongoose';
import {LipthusSchema} from "../lib";

export const name = 'tmp';

export function getSchema() {
	const s = new LipthusSchema({
		key: {type: String, index: true, unique: true},
		value: {},
		expire: Date
	}, {
		collection: 'tmp',
		modified: true
	});
	
	s.methods = {
		expired: function () {
			return this.expire && this.expire.getTime() < Date.now();
		},
		getValue: function () {
			return JSON.parse(this.value);
		},
	};
	
	//noinspection JSUnusedGlobalSymbols
	s.statics = {
		get: function (this: any, key: string) {
			return this.findOne({key: key});
		},
		set: function (this: any, key: string, value: any, expire?: Date) {
			const update: any = {
				value: value,
				modified: new Date()
			};
			
			if (expire)
				update.expire = expire;
			
			return this.findOneAndUpdate({key: key}, update, {upsert: true})
				.then((r?: any) => r || this(update));
		},
		getSet: function (key: string, getter: any) {
			return this.get(key)
				.then((doc?: any) => {
					if (doc && doc.expire.getTime() > Date.now())
						return doc;
					
					return getter()
						.then((obj: any) => this.set(key, obj.value, obj.expire));
				});
		}
	};
	
	return s;
}

export interface Tmp extends Document {
	key: string;
	value: any;
	expire: Date;
}

export interface TmpModel extends Model<Tmp> {
	
	// noinspection JSUnusedLocalSymbols
	get(key: string): Promise<any>;
	
	// noinspection JSUnusedLocalSymbols
	set(key: string, value: any, expire?: Date): Promise<any>;
	
	// noinspection JSUnusedLocalSymbols
	getSet(key: string, getter: any): Promise<any>;
	
}
