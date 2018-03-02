import {Schema} from "mongoose";

export function modifierPlugin(schema: any) {
	schema.add({modifier: {type: Schema.Types.ObjectId, ref: 'user'}});
	
	schema.methods.setModified = function (this: any, user: any) {
		return this.set({
			modified: new Date(),
			modifier: user
		});
	};
}
