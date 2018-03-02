import {LipthusSchema} from "../../lib";

export function removedPlugin (schema: LipthusSchema) {
	schema.add({removed: {type: Boolean, index: true}});
}
