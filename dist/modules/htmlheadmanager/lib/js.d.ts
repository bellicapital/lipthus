import { LipthusRequest, LipthusResponse } from "../../../index";
import { KeyAny } from "../../../interfaces/global.interface";
export declare class JsManager {
    req: LipthusRequest;
    dir: string;
    lipthusDir: string;
    jQuery: boolean;
    jQueryVersion: string;
    datepicker: boolean;
    staticHost: string;
    scripts: {
        [s: string]: JsFile;
    };
    vars: KeyAny;
    lang: string;
    headInline: string;
    mobileAjaxEnabled: boolean;
    deferredInline: string;
    deviceType: string;
    cache: any;
    constructor(req: LipthusRequest, res: LipthusResponse);
    add(src: Array<string> | string, opt?: any | number): JsManager;
    addVars(vars: KeyAny): void;
    addLangVars(vars: KeyAny): void;
    final(): Promise<unknown>;
    getMinified(script: any): Promise<any>;
    minify(scripts: {
        [s: string]: JsFile;
    }, target: string, cb: any): any;
}
declare class JsFile {
    minify: boolean;
    combine: boolean;
    deferred: boolean;
    forceHtml: boolean;
    async: boolean;
    attributes: Array<any>;
    mtime?: number;
    priority: number;
    src?: string;
    path?: string;
    constructor(p: any);
}
export {};
