import { LipthusRequest, LipthusResponse } from "../index";
import { NextFunction } from "express";
import { HeadManager } from "./htmlheadmanager";
import { KeyAny } from "../interfaces/global.interface";
import { MultilangText } from "./schema-types/mltext";
export declare class HtmlPage {
    req: LipthusRequest;
    res: LipthusResponse;
    jQuery: boolean;
    logLinks: boolean;
    head: HeadManager;
    noCache: boolean;
    locals: KeyAny;
    key: string;
    deviceType: string;
    openGraph: any;
    openGraphSet?: boolean;
    error?: Error | any;
    lang: string;
    userType?: string;
    userLevel?: number;
    formScriptsLevel?: number;
    robots: any;
    layout: string;
    view: string;
    pageTitle?: any;
    sent: boolean;
    sitelogo: any;
    userNav?: boolean;
    html?: string;
    metaKeywords?: MultilangText;
    metaDescription?: MultilangText | string;
    title?: any;
    private initiated;
    private loaded;
    constructor(req: LipthusRequest, res: LipthusResponse);
    init(opt?: string | any): Promise<HtmlPage>;
    set(opt?: any): this;
    checkUserLevel(level?: number): Promise<this>;
    load(): Promise<this>;
    send(view?: string, locals?: any): Promise<any>;
    finalCSS(): Promise<void>;
    finalJS(): Promise<unknown>;
    triggerNotFound(st?: number, min?: boolean): true | void;
    render(): any;
    getPageTitle(): any;
    setMetaKeywords(): Promise<void>;
    setMetaDescription(): Promise<void>;
    getSlogan(): Promise<string>;
    setOpenGraph(): this;
    addOpenGraph(k: string, v: string, multiple?: boolean): this;
    addOpenGraphMetas(): void;
    viewPath(): any;
    /**
     * Asigna el path completo de view si se encuentra
     * Usado en cmjs-newsletter plugin
     *
     * @param {String} view
     * @returns {*}
     */
    viewFullPath(view: string): string;
    msg(msg: string): Promise<any>;
    formScriptsMobile(): Promise<this>;
    formScripts(level: number, multilang?: boolean): this;
    addJS(src: string, opt?: any): this;
    addCSS(src: string, opt?: any): this;
    addJSVars(vars: KeyAny): this;
    addJSLang(a: any): this;
    addMeta(meta: any): this;
    addLogin(): void;
    addUserNav(): void;
    setItem(item: any): this;
    loadComments(item: any): Promise<any>;
    setNoCache(): this;
    mobileAjaxEnabled: boolean;
}
export declare function HtmlPageMiddleware(req: LipthusRequest, res: LipthusResponse, next: NextFunction): void;
