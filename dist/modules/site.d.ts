/// <reference types="node" />
import { EventEmitter } from "events";
import { Hooks } from "../interfaces/global.interface";
import { LipthusDb } from "../index";
import { LipthusApplication } from "../index";
import { Config } from "./config";
import '../lib/global.l';
export declare class Site extends EventEmitter {
    dir: string;
    private _hooks;
    lipthusDir: string;
    lipthusBuildDir: string;
    package: any;
    cmsPackage: any;
    conf: any;
    key: string;
    port: number;
    tmpdir: string;
    secret: string;
    mailer: any;
    config: Config;
    protocol: string;
    externalProtocol: string;
    staticHost: string;
    domainName: string;
    db: LipthusDb;
    app: LipthusApplication;
    pages: {
        [s: string]: any;
    };
    plugins: any;
    _lessVars: any;
    dbconf: any;
    dbs: any;
    langUrls: {
        [s: string]: string;
    };
    translator: any;
    store?: any;
    registerMethods: any;
    private _notifier;
    /**
     * @deprecated
     */
    cmsDir: string;
    constructor(dir: string, _hooks?: Hooks);
    connect(): void;
    addDb(p: any, schemasDir?: string): Promise<LipthusDb>;
    init(): any;
    readonly notifier: any;
    hooks(hook: string, method: string): any;
    loadPlugins(): Promise<void>;
    toString(): string;
    finish(): any;
    lessVars(): any;
    mainUrl(lang?: string, omitePort?: boolean): string;
    dbParams(): {
        name: any;
        user: any;
        pass: any;
        host: any;
    };
    sendMail(opt: any, throwError?: boolean): any;
    createApp(): void;
    setupApp(): any;
    logo(width: number, height: number): any;
    getPages(): any;
    setRoutes(): any;
    loadLocalRoutes(): any;
    routeNotFound(): void;
    listen(): Promise<{}>;
    langUrl(langcode?: string): string;
    translate(src: string, from: string, to: string, cb: (err: Error, r: any) => void, srclog: string): void;
}
