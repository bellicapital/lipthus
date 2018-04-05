import {LipthusSchema} from "../../lib";

export function lastActivated(schema: LipthusSchema) {
	schema.add({lastActivated: {type: Date, index: true}});
	
	schema.pre('save', function (this: any, next) {
		if (this.isDirectModified('active') && this.active)
			this.lastActivated = new Date;
		
		next();
	});
}
