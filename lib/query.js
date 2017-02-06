/**
 * extends mongoose.Query
 */

"use strict";

const Query = require('mongoose').Query;

/**
 * Usage Thing
 *	 .find({ name: /^hello/ })
 *	 .values()
 *
 * @param {object} req
 * @param {array} [ret]
 * @returns {Promise.<Array>} DocValues array in the given language
 */
Query.prototype.values = function(req, ret){
	if(!req)
		throw new Error('req param required');

	if(/^find(ById|One)/.test(this.op))
		return this.exec().then(doc => doc && doc.getValues(req));

	ret = ret || [];

	/**
	 * mongoose.QueryCursor
	 */
	const cursor = this.cursor();

	return cursor.eachAsync(doc => doc.getValues(req).then(v => ret.push(v))).then(() => ret);
};