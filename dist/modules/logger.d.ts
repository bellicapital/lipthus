import { LipthusApplication, LipthusRequest, LipthusResponse } from "../index";
import { Collection } from "mongodb";
import { LipthusError } from "../classes/lipthus-error";
import { NextFunction } from "express";
export declare class LipthusLogger {
    req: LipthusRequest;
    constructor(req: LipthusRequest);
    collection(type: string): Collection;
    log(collection: string | Collection, extra?: {
        [s: string]: any;
    }): Promise<any>;
    logError(err: LipthusError): Promise<void | Error>;
    logNotFound(): Promise<any>;
    logUpdate(obj: LogUpdateParams | string, id?: string, field?: string, value?: any): Promise<any>;
    count(type: string): Promise<number>;
    list(type: string, query: any, opt: any, cb: () => {}): void;
    baseObj(): any;
    notfoundArray(cb: any): Promise<any>;
    notfoundDetails(a: string, cb: any): void;
    notfoundRemove(a: string, cb: any): void;
    static init(app: LipthusApplication): void;
    static middleware(req: LipthusRequest, res: LipthusResponse, next: NextFunction): void;
    static botMiddleware(req: LipthusRequest, res: LipthusResponse, next: NextFunction): void;
    static notfoundArray(req: LipthusRequest, res: LipthusResponse, cb: Promise<any>): Promise<any>;
    static notfoundDetails(req: LipthusRequest, res: LipthusResponse, a: any, cb: any): void;
    static notfoundRemove(req: LipthusRequest, res: LipthusResponse, a: any, cb: any): void;
}
export interface LogUpdateParams {
    schema_: string;
    itemid: any;
    field: string;
    value: any;
    uid?: any;
}
