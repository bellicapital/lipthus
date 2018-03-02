import {LipthusSchema} from "../../lib";


export function lastModifiedPlugin(schema: LipthusSchema, options: any) {
	schema.add({modified: Date});
	
	schema.pre('save', function (this: any, next) {
		if (this.modifiedPaths().length)
			this.modified = new Date;
		
		next();
	});
	
	if (options && options.index) {
		schema.path('modified').index(options.index);
	}
}
