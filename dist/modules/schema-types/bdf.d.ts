import { SchemaType } from "mongoose";
export declare class Bdf extends SchemaType {
    path: string;
    options: any;
    collection?: string;
    id?: string;
    constructor(path: string, options: any);
    checkRequired(val: any): boolean;
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
    /**
     * Implement query casting, for mongoose 3.0
     *
     * @param {String} $conditional
     * @param {*} [value]
     */
    castForQuery($conditional: any, value: any): any;
}
export { Bdf as BdfType };
