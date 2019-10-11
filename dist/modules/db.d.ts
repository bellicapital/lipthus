import * as mongoose from 'mongoose';
import { Site } from "./site";
import { LipthusSchema } from '../lib';
import { GridFS } from "./../lib";
import { TmpModel } from "../schemas/tmp";
import { LipthusCacheModel } from "../schemas/cache";
import { SearchModel } from "../schemas/search";
import { UserModel } from "../schemas/user";
import { SettingModel } from "../schemas/settings";
import { NationalitiesModel } from "../schemas/nationalities";
import { DbParams, LipthusConnection } from "../interfaces/global.interface";
import { NotificationModel } from "../schemas/notification";
import { Collection } from "mongodb";
import { Connection } from "mongoose";
import { LipthusCacheResponseModel } from "../schemas/cache-response";
import { LipthusLanguageModel } from "../schemas/lang";
declare const LipthusDb_base: new () => any;
export declare class LipthusDb extends LipthusDb_base {
    site: Site;
    name: string;
    params: DbParams;
    connected: boolean;
    schemas: {
        [s: string]: LipthusSchema;
    };
    models: {
        [s: string]: any;
    };
    fs: GridFS;
    mongoose: typeof mongoose;
    _conn: LipthusConnection;
    constructor(params: DbParams | string, site: Site);
    connect(): void;
    connectParams(): {
        uri: string;
        options: any;
    };
    addLipthusSchemas(): Promise<any>;
    onConnError(e: any): void;
    onDisconnected(): void;
    onReconnected(): void;
    onConnOpen(): void;
    setFs(): void;
    toString(): string;
    db(dbName: string): LipthusDb;
    useDb(dbName: string): Connection;
    readonly dynobject: any;
    readonly search: SearchModel;
    readonly tmp: TmpModel;
    readonly user: UserModel;
    readonly settings: SettingModel;
    readonly cache: LipthusCacheModel;
    readonly cacheResponse: LipthusCacheResponseModel;
    readonly nationalities: NationalitiesModel;
    readonly notification: NotificationModel;
    readonly lang: LipthusLanguageModel;
    model(name: string, schema?: LipthusSchema): any;
    schema(name: string, schema: LipthusSchema): void;
    addSchemasDir(dir: string): Promise<void>;
    addPlugin(file: {
        name: string;
        getPlugin: any;
    }): void;
    collection(name: string, options?: any, cb?: any): Collection;
    /**
     *
     * @param {DBRef} ref
     * @param {object|function} fields ({title: 1, active: -1})
     * @returns {Promise}
     */
    deReference(ref: any, fields?: any): any;
}
export {};
