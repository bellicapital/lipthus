import {LipthusSchema} from "../lib";

export const name = 'logRoute';

export function getSchema() {
	return new LipthusSchema({
		url: String,
		start: Date,
		time: Number,
		memoryStart: {},
		memoryEnd: {},
		memoryDiff: {}
	}, {
		collection: 'log.route'
	});
}
