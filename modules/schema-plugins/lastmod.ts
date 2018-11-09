import {LipthusSchema} from "../../lib";


export function lastModifiedPlugin(schema: LipthusSchema) {
	schema.add({modified: Date});

	schema.pre('save', function (this: any, next: any) {
		if (this.modifiedPaths().length)
			this.set('modified', new Date);

		next();
	});
}
