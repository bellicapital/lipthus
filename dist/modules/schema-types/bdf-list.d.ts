import { BinDataFile } from "../bdf";
import { SchemaType } from "mongoose";
import BinDataImage from "../bdi";
export declare class BinDataFileList {
    /**
     * First element
     * @returns {BinDataFile}
     */
    getFirst(): BinDataFile | BinDataImage;
    getThumb(width: number, height: number, crop?: boolean, enlarge?: boolean): any;
    info(width: number, height: number, crop: boolean, enlarge: boolean): any[];
    toObject(): any;
    formDataValue(): any;
    size(): number;
}
export declare class BdfList extends SchemaType {
    collection: string;
    id: string;
    path?: string;
    dbname: string;
    constructor(key: string, options: any);
    checkRequired(val: any): boolean;
    /**
     * Implement casting.
     *
     * @param {*} val
     * @param {Object} [scope]
     * @param {Boolean} [init]
     * @return {*}
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
        '$exists': (r: boolean) => boolean;
    };
    /**
     * Implement query casting, for mongoose 3.0
     *
     * @param {String} $conditional
     * @param {*} [value]
     */
    castForQuery($conditional: any, value: any): any;
}
