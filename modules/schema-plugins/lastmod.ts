import {LipthusSchema} from "../../lib";


export function lastModifiedPlugin(schema: LipthusSchema) {
	schema.add({modified: Date});

	schema.pre('save', function (this: any, next) {
		if (this.modifiedPaths().length)
			this.modified = new Date;

		next();
	});
}
