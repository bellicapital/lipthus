import { LipthusApplication, LipthusRequest, Site } from "../index";
import { KeyAny, KeyString } from "../interfaces/global.interface";
export declare class Multilang {
    req: LipthusRequest;
    lang: string;
    configLang: string;
    langs: KeyString;
    fblocales: KeyAny;
    langUrls: KeyString;
    loaded: KeyAny;
    all: KeyAny;
    translator: any;
    baseHost?: string;
    private locale?;
    private _availableLangNames?;
    private _allLangNames?;
    static defaultLang: string;
    static defaultLocale: string;
    static availableLangs: {
        ca: string;
        cs: string;
        de: string;
        en: string;
        es: string;
        fr: string;
        it: string;
        hu: string;
        nl: string;
        no: string;
        pl: string;
        pt: string;
        ro: string;
        sk: string;
        sl: string;
        sv: string;
        tr: string;
        el: string;
        ru: string;
        bg: string;
        ar: string;
        zh: string;
        ja: string;
        ko: string;
    };
    constructor(req: LipthusRequest);
    static _translateAvailable(site: Site): boolean;
    static availableLanguages(site: Site): any;
    getLocale(): string;
    /**
     * provisional. Se ha de realizar todo el proyecto de localización
     * @returns {String}
     */
    private _getLocale;
    translateAvailable(): boolean;
    private _loadArray;
    /**
     * Carga paquetes de idioma
     *
     * @param {string|array} tag
     * @returns {Promise<{}>} todos los resultados acumulados
     */
    load(tag: string | Array<string>): Promise<KeyString>;
    private _checkResult;
    timeZoneList(): Promise<{
        "-12": string;
        "-11": string;
        "-10": string;
        "-9": string;
        "-8": string;
        "-7": string;
        "-6": string;
        "-5": string;
        "-4": string;
        "-3.5": string;
        "-3": string;
        "-2": string;
        "-1": string;
        "0": string;
        "1": string;
        "2": string;
        "3": string;
        "3.5": string;
        "4": string;
        "4.5": string;
        "5": string;
        "5.5": string;
        "6": string;
        "7": string;
        "8": string;
        "9": string;
        "9.5": string;
        "10": string;
        "11": string;
        "12": string;
    }>;
    get(k: string): any;
    langUserNames(): Promise<KeyString>;
    allLangNames(): Promise<KeyString>;
    availableLangNames(): Promise<KeyString>;
    translate(src: any, cb: any, srcLog?: any): void;
}
export declare function MultilangModule(app: LipthusApplication): Promise<any>;
