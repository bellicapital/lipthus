/* global module */

module.exports = function lastActivated (schema, options) {
	schema.add({lastActivated: {type: Date, index: true}});
	
	schema.pre('save', function (next) {
		if(this.isDirectModified('active') && this.active)
			this.lastActivated = new Date;

		next();
	});
};