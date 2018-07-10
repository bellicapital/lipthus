import { SchemaType, Types } from "mongoose";
import { Site } from "../site";
export declare class Multilang extends SchemaType {
    path: string;
    options: any;
    /**
     * @param {String} path
     * @param {Object} [options]
     */
    constructor(path: string, options: any);
    readonly $conditionalHandlers: {
        '$lt': (this: any, val: any) => any;
        '$lte': (this: any, val: any) => any;
        '$gt': (this: any, val: any) => any;
        '$gte': (this: any, val: any) => any;
        '$ne': (this: any, val: any) => any;
        '$in': (this: any, val: any[]) => any[];
        '$nin': (this: any, val: any[]) => any[];
        '$mod': (this: any, val: any[]) => any[];
        '$all': (this: any, val: any[]) => any[];
        '$exists': () => boolean;
    };
    checkRequired(val: any): boolean;
    cast(val: any, scope?: any, init?: any): any;
    /**
     * Implement query casting, for mongoose 3.0
     *
     * @param {String} $conditional
     * @param {*} [value]
     */
    castForQuery($conditional: any, value: any): any;
    static readonly MultilangText: typeof MultilangText;
}
export declare class MultilangText {
    obj: any;
    collection: any;
    path: string;
    _id: Types.ObjectId;
    site: Site;
    constructor(obj: any, collection: any, path: string, _id: Types.ObjectId, site: Site);
    toJSON(): any;
    getLang(lang: string, alt?: string): string;
    /**
     *
     * @param {string} lang
     * @returns {Promise}
     */
    getLangOrTranslate(lang: string): Promise<{}>;
    updateLang(lang: string, data: any): void;
    toString(): any;
}
export { Multilang as MultilangType };
