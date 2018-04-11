import { LipthusSchema } from "../lib";
import {Document, Model} from "mongoose";

export const name = "cache";

export function getSchema() {
	const s = new LipthusSchema(
		{
			name: { type: String, index: true },
			expires: Date,
			contentType: String,
			tag: String,
			mtime: Date,
			MongoBinData: Buffer,
			source: { type: String, index: true },
			srcmd5: String,
			ref: {},
			width: Number,
			height: Number,
			crop: Boolean,
			size: Number,
			wm: {}
		},
		{
			created: true,
			lastMod: true
		}
	);

	s.pre("save", function(this: any, next: (err?: Error) => void) {
		if (!this.expires) {
			const expires = new Date();
			this.set('expires', expires.setDate(expires.getDate() + 30));
		}
		next();
	});

	return s;
}

export interface LipthusCache extends Document {
	name: string;
	expires: Date;
	contentType: string;
	tag: string;
	mtime: Date;
	MongoBinData: Buffer;
	source: string;
	srcmd5: string;
	ref: any;
	width: number;
	height: number;
	crop: boolean;
	size: number;
	wm: any;
	created: Date;
	modified: Date;
}

export interface LipthusCacheModel extends Model<LipthusCache> {

}
