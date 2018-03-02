import {Document, Model} from 'mongoose';
import {LipthusSchema} from "../lib";
import {LipthusRequest} from "../typings/lipthus";

export const name = 'search';

export function getSchema() {
	const s = new LipthusSchema({
		query: String
	}, {
		collection: 'searches',
		created: true,
		location: true
	});
	
	
	s.statics = {
		log: function(req: LipthusRequest, query: any) {
			return this.create({
				query: query,
				location: req.ipLocation
			});
		}
	};
	
	return s;
}

export interface Search extends Document {
	query: string;
	created?: Date;
}

export interface SearchModel extends Model<Search> {
	
	// noinspection JSUnusedLocalSymbols
	log(req: LipthusRequest, query: any): Promise<any>;
	
}
