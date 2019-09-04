import { SchemaType, Types } from "mongoose";
import { KeyAny } from "../../interfaces/global.interface";
export declare class FsList {
    constructor(val: any, type: string, collection: string, itemId: Types.ObjectId, path: string, dbname: string);
    keys(): string[];
    /**
     * Get the first element
     * @returns {GridFSFile}
     */
    getFirst(): any;
    size(): number;
    getThumb(width: number, height: number, crop: any): {
        width: number;
        height: number;
        contentType: string;
        uri: string;
    };
    toJSON(): KeyAny;
    info(): any;
    loadFiles(): Promise<any>;
    /**
     * File value to include in form fields
     * @returns {String}
     */
    formDataValue(): any;
}
export declare class Fs extends SchemaType {
    path: string;
    options: any;
    collection?: string;
    dbname?: string;
    id?: Types.ObjectId;
    constructor(path: string, options: any);
    /**
     * Implement casting.
     *
     * @param {*} val
     * @param {Object} [scope]
     * @param {Boolean} [init]
     * @return {any}
     */
    cast(val: any, scope?: any, init?: any): any;
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
    castForQuery($conditional: any, value: any): any;
}
export { Fs as FsType };
