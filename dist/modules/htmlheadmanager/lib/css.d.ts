import { LipthusRequest, LipthusResponse } from "../../../index";
export declare class CssManager {
    req: LipthusRequest;
    publicDir: string;
    dir: string;
    lipthusDir: string;
    jQueryUiVersion: string;
    jQueryMobile: boolean;
    jQueryUi: boolean;
    jQueryMobileVersion: string;
    jQueryMobileTheme?: string;
    scripts: {
        [s: string]: CssFile;
    };
    jQueryUiTheme: string;
    staticHost: string;
    deviceType: string;
    routes: Array<CssRoute>;
    inited: boolean;
    constructor(req: LipthusRequest, res: LipthusResponse);
    init(): this | undefined;
    add(src: string, opt?: any | number): this;
    final(): Promise<any>;
    /**
     * @param {string} [theme]
     * @returns {string}
     */
    jQueryuiSrc(theme?: string): string;
    /**
     * @param {string} [theme]
     * @returns {string}
     */
    addjQueryMobile(theme?: string): this | undefined;
    combine(scripts: Array<any>): Promise<any | undefined>;
    absolutePath(fn: string): any;
    static extPath(dir: string, fn: string): false | {
        path: string;
        basename: string;
        fn: string;
        ext: string;
    } | undefined;
}
declare class CssFile {
    inline: boolean;
    deferred: boolean;
    attributes: Array<any>;
    priority: number;
    basename?: string;
    device?: string;
    isCMS: boolean;
    path?: string;
    mtime?: number;
    url?: string;
    constructor(p: any);
    baseKey(): string;
}
export interface CssRoute {
    path: string;
    url: string;
    isDevice?: boolean;
    isCMS?: boolean;
}
export {};
