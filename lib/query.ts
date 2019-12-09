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
 * @returns {Promise.<Array>} DocValues array in the given language
 */
(Query as any).prototype.values = function (this: any, req: any): any {
	if (!req)
		throw new Error('req param required');
	
	if (/^find(ById|One)/.test(this.op))
		return this.exec().then((doc: any) => doc && doc.getValues(req));
	
	const ret: any[] = [];
	
	/**
	 * mongoose.QueryCursor
	 */
	const cursor = this.cursor();
	
	return cursor.eachAsync((doc: any) => doc.getValues(req).then((v: any) => ret.push(v))).then(() => ret);
};

export {Query};
