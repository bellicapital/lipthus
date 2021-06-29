import {LipthusSchema} from "../lib";
import {Model} from "mongoose";
import {LipthusDocument} from "../interfaces/lipthus-document";
import {LipthusCache} from "./cache";

export const name = "cacheResponse";

// noinspection JSUnusedGlobalSymbols
export function getSchema() {
	const s = new LipthusSchema({
		uri: String,
		device: {type: String, index: true},
		lang: {type: String, index: true},
		expires: Date,
		contentType: String,
		MongoBinData: Buffer
	}, {
		collection: 'cache.response',
		created: true,
		lastMod: true
	});

	s.index({
		uri: 1,
		device: 1,
		lang: 1
	}, {
		unique: true
	});

	s.virtual('expired').get(function(this: LipthusCache) {
		return this.expires.getTime() < Date.now();
	});

	s.statics = {
		clear: function () {
			return new Promise((ok, ko) => {
				// @ts-ignore (throws errors in client instances)
				this.db.collection(this.schema.options.collection).drop((err: Error) => {
					err && err.message !== 'ns not found' ? ko(err) : ok();
				});
			});
		}
	};

	return s;
}

export interface LipthusCacheResponse extends LipthusDocument {
	uri: string;
	device: string;
	lang: string;
	expires: Date;
	contentType: string;
	MongoBinData: Buffer;
	created: Date;
	modified: Date;
}

export interface LipthusCacheResponseModel extends Model<LipthusCacheResponse> {

}
