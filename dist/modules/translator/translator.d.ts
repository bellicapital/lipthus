import { Site } from "../site";
import { AzureTranslator } from "./azureTranslator";
import { GoogleTranslator } from "./googleTranslator";
export declare class Translator {
    site: Site;
    service: any;
    client: AzureTranslator | GoogleTranslator | undefined;
    private tmp;
    private _availableLangs?;
    private cache;
    private logger;
    constructor(site: Site);
    availableLangs(): Promise<any>;
    translate(src: string | Array<string>, from: string, to: string, cb: any, srclog: any): any;
    /**
     * Obtiene una copia temporal de los nombres locales de los idiomas disponibles
     */
    tmpNames(): Promise<any>;
    langNames(lang: string, cb: any): void;
    _langNames(lang: string, cb: any): void;
}
