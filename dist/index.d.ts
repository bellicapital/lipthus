/// <reference types="node" />
import './lib/vanilla.extensions';
import { LipthusDb, Site, SiteOptions } from "./modules";
import { User } from "./schemas/user";
import * as express from "express";
import { ApplicationRequestHandler, CssResponse, KeyString } from "./interfaces/global.interface";
import { LipthusError } from "./classes/lipthus-error";
import { LipthusLogger } from "./modules/logger";
import { Multilang } from "./modules/multilang";
import { HtmlPage } from "./modules/htmlpage";
import { LipthusWebSocketServer } from "./classes/web-socket-server";
import { Server as SServer } from "https";
import { Server as Server } from "https";
export declare function lipthusSite(dir: string, options?: SiteOptions): Promise<Site>;
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
    ml: Multilang;
    device: any;
    logger: LipthusLogger;
    logIn: (user: any, cb: any) => void;
    logout: () => void;
    userLoginMsg?: string;
    db: LipthusDb;
    site: Site;
    app: LipthusApplication;
    session: any;
    user?: User;
    maxImgWidth?: number;
    maxImgHeight?: number;
    imgCrop?: boolean;
    imgEnlarge?: boolean;
    imgnwm?: boolean;
    ipLocation: any;
    nationalities: KeyString;
    getUser: () => Promise<User>;
    files: Array<any>;
    security: any;
    logError: (err: LipthusError) => Promise<void | Error>;
    lessSourceMap: string;
    cssResponse: CssResponse;
    sessionID: string;
    /**
     * @deprecated
     */
    cmsDir: string;
}
export interface LipthusResponse extends express.Response {
    now: number;
    htmlPage: HtmlPage;
    timer: any;
}
export interface LipthusApplication extends express.Application {
    use: any | ApplicationRequestHandler<this>;
    db: LipthusDb;
    site: Site;
    wss: LipthusWebSocketServer;
    server: SServer | Server;
    subscriptor: any;
    getModule: (name: string) => any;
    nodeModule: (name: string) => any;
}
export { LipthusError } from './classes/lipthus-error';
export { LipthusWebSocketServer } from './classes/web-socket-server';
export { LipthusDocument } from './interfaces/lipthus-document';
export declare const nodeModule: (key: string) => any;
export { Setting, SettingModel } from "./schemas/settings";
export { LipthusCache, LipthusCacheModel } from "./schemas/cache";
export { Tmp, TmpModel } from "./schemas/tmp";
export { Search, SearchModel } from "./schemas/search";
export { User, UserModel } from "./schemas/user";
export { NationalitiesModel, Nationality } from './schemas/nationalities';
export { EnvironmentParams, DbParams } from './interfaces/global.interface';
export { LipthusComment, LipthusCommentModel } from "./schemas/comment";
export { LipthusPage, LipthusPageModel } from './schemas/page';
