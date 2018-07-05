import { CssManager } from "./css";
import { JsManager } from "./js";
import { LipthusRequest, LipthusResponse } from "../../../index";
export declare class HeadManager {
    req: LipthusRequest;
    css: CssManager;
    js: JsManager;
    metas: Array<any>;
    links: Array<any>;
    constructor(req: LipthusRequest, res: LipthusResponse);
    readonly hreflangs: {
        [s: string]: string;
    } | undefined;
    addJS(src: Array<string> | string, opt: any): this;
    addCSS(src: string, opt: any): this;
    addJSVars(vars: any): this;
    addLink(obj: any): this;
    addMetaName(name: string, content: string): void;
    addMetaProperty(property: string, content: string): void;
    addMeta(meta: any): void;
    removeLink(obj: any): this;
    langUris(url?: string): {
        [s: string]: string;
    } | undefined;
    jQueryMobile(theme?: string): void;
    jQueryPlugin(name: string, opt?: any): this;
    addJSLang(a: any): void;
    datepicker(): this;
    addGMap(): this;
    formScriptsMobile(): any;
    formScripts(level: number, multilang?: boolean, cb?: any): this;
}
