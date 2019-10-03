import { ConfigVar } from "./configvar";
import { Site } from "../site";
import { BinDataImage } from "../bdi";
import { MultilangText } from "../schema-types/mltext";
import { ConfigModel } from "../../schemas/config";
export declare class Config {
    site: Site;
    [key: string]: any;
    groups: {
        [key: string]: {
            title: string;
            configs: {
                [configKey: string]: ConfigVar;
            };
        };
    };
    configs: {
        [configKey: string]: ConfigVar;
    };
    adminmail?: string;
    allow_register?: boolean;
    external_protocol: string;
    fb_app_id?: string;
    googleApiKey?: string;
    googleSecret?: string;
    host: string;
    language: string;
    port?: number;
    protocol: string;
    site_credentials?: boolean;
    sitelogo?: BinDataImage;
    sitename?: string;
    siteversion: string;
    slogan?: MultilangText;
    startpage: string;
    static_host?: string;
    version: string;
    webmastermail?: string;
    model: ConfigModel | any;
    lang_subdomains?: boolean;
    auto_hreflang?: boolean;
    sessionExpireDays?: number;
    constructor(site: Site);
    load(): Promise<void>;
    get(k: string, update?: any, cb?: (v: any) => void): any;
    set(k: string, v: any, ns?: string | true, save?: boolean): any;
    getConfigsByCat(cat: string): {
        [configKey: string]: ConfigVar;
    };
    getValuesByCat(cat: string): any;
    metaRobots(cb?: (a: any) => {}): any;
    check(): Promise<void>;
    checkDefaults(): Promise<void>;
}
