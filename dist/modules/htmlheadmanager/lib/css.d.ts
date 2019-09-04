import { LipthusRequest, LipthusResponse } from "../../../index";
export declare class CssManager {
    req: LipthusRequest;
    publicDir: string;
    dir: string;
    lipthusDir: string;
    scripts: {
        [s: string]: CssFile;
    };
    staticHost: string;
    deviceType: string;
    routes: Array<CssRoute>;
    inited: boolean;
    constructor(req: LipthusRequest, res: LipthusResponse);
    init(): this;
    add(src: string, opt?: any | number): this;
    final(): Promise<any>;
    combine(scripts: Array<any>): Promise<any | undefined>;
    absolutePath(fn: string): any;
    static extPath(dir: string, fn: string): any;
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
