/* global module */

module.exports = function removedPlugin (schema, options) {
	schema.add({removed: {type: Boolean, index: true}});
};