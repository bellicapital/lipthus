import './lib/vanilla.extensions';
import './lib/global.l';
import { LipthusDb, Site } from "./modules";
import { User } from "./schemas/user";
import * as express from "express";
import { ApplicationRequestHandler, CssResponse, KeyString } from "./interfaces/global.interface";
import { UploadedFile } from "./interfaces/uploaded-file";
import { LipthusError } from "./classes/lipthus-error";
import { LipthusLogger } from "./modules/logger";
export declare function lipthusSite(dir: string, options?: any): Promise<Site>;
export * from './modules';
export * from './lib';
export { Types } from 'mongoose';
export { Router, NextFunction } from 'express';
export interface LipthusRequest extends express.Request {
    res: LipthusResponse;
    domainName: string;
    staticHost: string;
    fullUri: string;
    notifyError: (err: any) => void;
    ml: any;
    device: any;
    logger: LipthusLogger;
    db: LipthusDb;
    site: Site;
    app: LipthusApplication;
    session: any;
    user?: User;
    maxImgWidth?: number;
    maxImgHeight?: number;
    imgCrop?: boolean;
    imgnwm?: boolean;
    ipLocation: any;
    nationalities: KeyString;
    getUser: () => Promise<User>;
    files?: Array<UploadedFile>;
    security: any;
    logError: (err: LipthusError) => Promise<any>;
    lessSourceMap: string;
    cssResponse: CssResponse;
    /**
     * @deprecated
     */
    cmsDir: string;
}
export interface LipthusResponse extends express.Response {
    now: number;
    htmlPage: any;
}
export interface LipthusApplication extends express.Application {
    use: ApplicationRequestHandler<this>;
    db: LipthusDb;
    site: Site;
    getModule: (name: string) => any;
    nodeModule: (name: string) => any;
}
export { LipthusError } from './classes/lipthus-error';
export { LipthusDocument } from './interfaces/lipthus-document';
export declare const nodeModule: (key: string) => any;
export { Setting, SettingModel } from "./schemas/settings";
export { LipthusCache, LipthusCacheModel } from "./schemas/cache";
export { Tmp, TmpModel } from "./schemas/tmp";
export { Search, SearchModel } from "./schemas/search";
export { User, UserModel } from "./schemas/user";
export { NationalitiesModel, Nationality } from './schemas/nationalities';
export { EnvironmentParams, DbParams } from './interfaces/global.interface';
