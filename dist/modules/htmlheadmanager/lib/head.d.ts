import { CssManager } from "./css";
import { JsManager } from "./js";
import { LipthusRequest, LipthusResponse } from "../../../index";
import { KeyString } from "../../../interfaces/global.interface";
export declare class HeadManager {
    req: LipthusRequest;
    css: CssManager;
    js: JsManager;
    metas: Array<any>;
    links: Array<any>;
    constructor(req: LipthusRequest, res: LipthusResponse);
    readonly hreflangs: KeyString | void;
    addJS(src: Array<string> | string, opt?: any): this;
    addCSS(src: string, opt?: any): this;
    addJSVars(vars: any): this;
    addLink(obj: any): this;
    addMetaName(name: string, content: string): void;
    addMetaProperty(property: string, content: string): void;
    addMeta(meta: any): void;
    removeLink(obj: any): this;
    langUris(url?: string): KeyString | void;
    jQueryPlugin(name: string, opt?: any): this;
    addJSLang(a: any): void;
    addGMap(): this;
    formScriptsMobile(): Promise<this>;
    formScripts(level: number, multilang?: boolean): this;
}
