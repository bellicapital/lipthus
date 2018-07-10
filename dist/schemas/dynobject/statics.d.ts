import { LipthusRequest } from "../../index";
/**
 *
 * @param {object} req
 * @param {object} query
 * @param {*} fields
 * @param {*} options
 */
export declare function findAndGetValuesWithCommentCount(this: any, req: LipthusRequest, query?: {}, fields?: any | string, options?: any): any;
export declare function findAndGetValues(this: any, req: LipthusRequest, query: {} | undefined, fields: any | string, options: any, cb: (err?: Error, result?: any, arr?: Array<any>) => {}): void;
export declare function getByParent(this: any, parentId: any, fields: any, options: any, cb: () => {}): any;
export declare function checkAll(this: any, req: any, cb: (err?: Error, r?: any) => {}): void;
export declare function translatableFieldList(this: any): any[];
export declare function colTitle(this: any, lang: string): any;
export declare function getCleanVars4Edit(this: any): any;
