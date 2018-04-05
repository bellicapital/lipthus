/**
 * extends mongoose.Query
 */

import {Query} from "mongoose";

/**
 * Usage Thing
 *     .find({ name: /^hello/ })
 *     .values()
 *
 * @param {object} req
 * @param {array} [ret]
 * @returns {Promise.<Array>} DocValues array in the given language
 */
(Query as any).prototype.values = function (req: any, ret: any) {
	if (!req)
		throw new Error('req param required');
	
	if (/^find(ById|One)/.test(this.op))
		return this.exec().then((doc: any) => doc && doc.getValues(req));
	
	ret = ret || [];
	
	/**
	 * mongoose.QueryCursor
	 */
	const cursor = this.cursor();
	
	return cursor.eachAsync((doc: any) => doc.getValues(req).then((v: any) => ret.push(v))).then(() => ret);
};

export {Query};
