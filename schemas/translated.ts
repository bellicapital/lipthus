// jj 27-06-20 · used anywhere???

import {Document, Model} from 'mongoose';
import {LipthusSchema} from "../lib";

export const name = 'translated';

export function getSchema() {
	const s = new LipthusSchema({
		from: String,
		to: {type: String, required: true},
		dbname: {type: String, required: true},
		colname: {type: String, required: true},
		itemid: {type: LipthusSchema.Types.ObjectId, required: true},
		field: {type: String, required: true},
		uid: {type: LipthusSchema.Types.ObjectId, required: true, ref: 'user'},
		words: Number,
		submitter: {type: LipthusSchema.Types.ObjectId, ref: 'user'},
		modifier: {type: LipthusSchema.Types.ObjectId, ref: 'user'}
	}, {
		collection: 'translated',
		created: true,
		modified: true
	});

	s.index({col: 1, itemid: 1, field: 1, to: 1}, {unique: true, dropDups: true});

	return s;
}

export interface Translated extends Document {
	key: string;
	value: any;
	expire: Date;
}

// noinspection JSUnusedGlobalSymbols
export interface TranslatedModel extends Model<Translated> {
}
