export declare class GoogleTranslator {
    apiKey: string;
    gt: GoogleApi;
    constructor(apiKey: string);
    availableLangs(cb: any): void;
    translate(src: Array<string>, from: string, to: string, cb: any): void;
    /**
     *
     * @param {string} target Lang code
     * @param {Array} codes Usado para compatibilidad con azure
     * @param {function} cb
     * @returns {undefined}
     */
    langNames(target: string, codes: Array<string>, cb: any): void;
}
interface GoogleApi {
    translate(strings: Array<string>, sourceLang: string, targetLang: string, done: (err: Error | string, result: Array<any>) => any): any;
    getSupportedLanguages(target: string | any, done?: (err: Error | string, result: any) => any): any;
    detectLanguage: any;
}
export {};
