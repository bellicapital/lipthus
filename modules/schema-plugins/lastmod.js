/* global module */

module.exports = function lastModifiedPlugin (schema, options) {
	schema.add({ modified: Date });
  
	schema.pre('save', function (next) {
		if(this.modifiedPaths().length)
			this.modified = new Date;
		
		next();
	});
  
	if(options && options.index) {
		schema.path('modified').index(options.index);
	}
};