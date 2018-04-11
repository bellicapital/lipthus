import {Schema} from "mongoose";

export function modifierPlugin(schema: any) {
	// No funciona en mongoose 5.0.14!!!!!
	schema.add({modifier: {type: Schema.Types.ObjectId, ref: 'user'}});

	schema.methods.setModified = function (this: any, user: any) {
		return this.set({
			modified: new Date(),
			modifier: user
		});
	};
}
