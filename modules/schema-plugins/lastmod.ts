import {LipthusSchema} from "../../lib";


export function lastModifiedPlugin(schema: LipthusSchema) {
	schema.add({modified: Date});

	schema.pre('save', function (this: any, next: any) {
		const modifiedPaths = this.modifiedPaths();

		// if modifiedPaths includes created, not save for created plugin
		if (modifiedPaths.length && !this.modifiedPaths().includes('created'))
			this.set('modified', new Date);

		next();
	});
}
