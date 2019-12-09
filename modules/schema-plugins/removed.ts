import {LipthusSchema} from "../../lib";

export function removedPlugin (schema: LipthusSchema) {
	schema.add({removed: Boolean});
	// schema.index({removed: 1});
}
