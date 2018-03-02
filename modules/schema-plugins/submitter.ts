import {Schema} from "mongoose";
import {LipthusSchema} from "../../lib";

export function submitterPlugin(schema: LipthusSchema) {
	schema.add({submitter: {type: Schema.Types.ObjectId, ref: 'user' }});
}
