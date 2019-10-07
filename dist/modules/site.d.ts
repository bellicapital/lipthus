/// <reference types="node" />
import { EventEmitter } from "events";
import { DbParams, EnvironmentParams, KeyAny, KeyString } from "../interfaces/global.interface";
import { LipthusDb } from "./db";
import { LipthusApplication, UserModel } from "../index";
import { Config } from "./config";
export declare class Site extends EventEmitter {
    dir: string;
    options: SiteOptions;
    srcDir: string;
    lipthusDir: string;
    lipthusBuildDir: string;
    package: any;
    cmsPackage: any;
    key: string;
    tmpDir: string;
    secret: string;
    mailer: any;
    config: Config;
    protocol: string;
    externalProtocol: string;
    staticHost: string;
    domainName: string;
    db: LipthusDb;
    app: LipthusApplication;
    plugins: any;
    _lessVars: any;
    dbconf: DbParams;
    dbs: {
        [s: string]: LipthusDb;
    };
    langUrls: {
        [s: string]: string;
    };
    translator: any;
    store?: any;
    registerMethods: any;
    environment: EnvironmentParams;
    langs: KeyString;
    availableLangs: KeyAny;
    availableTanslatorLangs: KeyAny;
    sitemap?: any;
    private _notifier;
    private _userCol?;
    private _authDb;
    private _hooks;
    /**
     * @deprecated
     */
    cmsDir: string;
    constructor(dir: string, options?: SiteOptions);
    getEnvironment(): EnvironmentParams;
    connect(): void;
    addDb(name: string | any, schemasDir?: string): Promise<LipthusDb>;
    init(): Promise<void>;
    readonly notifier: any;
    readonly authDb: LipthusDb;
    readonly userCollection: UserModel;
    hooks(hook: string, method: string): any;
    loadPlugins(): Promise<void>;
    toString(): string;
    finish(): Promise<void>;
    lessVars(): any;
    mainUrl(lang?: string, omitePort?: boolean): string;
    sendMail(opt: any, throwError?: boolean): Promise<any>;
    createApp(): void;
    setupApp(): Promise<void>;
    logo(width?: number, height?: number): any;
    routeNotFound(): void;
    listen(): Promise<void>;
    langUrl(langcode?: string): string;
    translate(src: string, from: string, to: string, cb: (err: Error, r: any) => void, srclog: string): void;
}
export interface SiteOptions {
    pre?: {
        checkVersion?: any;
        setupApp?: any;
        finish?: any;
    };
    post?: {
        setupApp?: any;
        plugins?: any;
        finish?: any;
    };
    skipListening?: boolean;
}
