import {LipthusSchema} from "../../lib";

export function lastActivated(schema: LipthusSchema) {
	schema.add({lastActivated: Date});
	schema.index({lastActivated: 1});

	schema.pre('save', function (this: any, next: any) {
		if (this.isDirectModified('active') && this.active)
			this.lastActivated = new Date;

		next();
	});
}
