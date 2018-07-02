declare const MsTranslator: any;
export declare class AzureTranslator {
    ms: MsTranslator;
    globalError: AzGlobalError;
    constructor(client_id: string, client_secret: string);
    availableLangs(cb: any): void;
    translate(src: Array<string>, from: string, to: string, cb: any): any;
    langNames(target: string, codes: Array<string>, cb: any): void;
}
interface MsTranslator {
    initialize_token(callback: (err: Error) => any, noRefresh?: boolean): any;
    getLanguagesForTranslate(callback: (err: Error) => any): any;
    translateArray(params: any, callback: (err: Error, r: string | Array<any>) => any): any;
    getLanguageNames(params: any, callback: (err: Error, r: Array<string>) => any): any;
}
interface AzGlobalError {
    time: number;
    err: Error;
}
export {};
