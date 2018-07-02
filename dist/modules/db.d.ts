import * as mongoose from 'mongoose';
import { Site } from "./site";
import { DBRef } from "bson";
import { LipthusSchema } from '../lib';
import { TmpModel } from "../schemas/tmp";
import { LipthusCacheModel } from "../schemas/cache";
import { SearchModel } from "../schemas/search";
import { UserModel } from "../schemas/user";
import { SettingModel } from "../schemas/settings";
import { NationalitiesModel } from "../schemas/nationalities";
declare const LipthusDb_base: new () => any;
export declare class LipthusDb extends LipthusDb_base {
    params: any;
    site: Site;
    name: string;
    connected: boolean;
    schemas: {
        [s: string]: LipthusSchema;
    };
    models: {
        [s: string]: any;
    };
    mongoose: typeof mongoose;
    constructor(params: any, site: Site);
    connect(): void;
    addLipthusSchemas(): any;
    onConnError(e: any): void;
    onDisconnected(): void;
    onReconnected(): void;
    onConnOpen(): void;
    toString(): string;
    db(dbname: string): any;
    readonly dynobject: any;
    readonly search: SearchModel;
    readonly tmp: TmpModel;
    readonly user: UserModel;
    readonly settings: SettingModel;
    readonly cache: LipthusCacheModel;
    readonly cacheResponse: any;
    readonly nationalities: NationalitiesModel;
    model(name: string): any;
    schema(name: string, schema: LipthusSchema): void;
    addSchemasDir(dir: string): any;
    addPlugin(file: {
        name: string;
        getPlugin: any;
    }): void;
    collection(name: string, options: any, cb: Function): any;
    /**
     *
     * @param {DBRef} ref
     * @param {object|function} fields ({title: 1, active: -1})
     * @returns {Promise}
     */
    deReference(ref: DBRef, fields: any): any;
}
export {};
