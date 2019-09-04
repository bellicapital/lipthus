declare const w3c: {
    results: {};
    getUrl(this: any, uri: string): string;
    get(uri: string, sec: number): any;
    ajaxErrorCount(uri: string): any;
    validate(uri: string): any;
    cach(uri: string, content: any): any;
    getCached(uri: string): any;
};
export default w3c;
