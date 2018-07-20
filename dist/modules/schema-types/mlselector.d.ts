import { SchemaType } from "mongoose";
import { LipthusRequest } from "../../index";
import { LipthusDb } from "../db";
export declare class MlSelector extends SchemaType {
    path: string;
    options: any;
    val: any;
    /**
     *
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
    /**
     * Implement checkRequired method.
     *
     * @param {*} val
     * @return {Boolean}
     */
    checkRequired(val: any): boolean;
    /**
     * Implement casting.
     *
     * @param {*} val
     * @param {Object} [scope]
     * @param {Boolean} [init]
     * @return {any}
     */
    cast(val: any, scope: any, init: any): any;
    /**
     * Implement query casting, for mongoose 3.0
     *
     * @param {String} $conditional
     * @param {*} [value]
     */
    castForQuery($conditional: any, value: any): any;
    getVal(req: LipthusRequest, db: LipthusDb): any;
    toString(): any;
}
export declare const MlSelectorType: typeof MlSelector;
