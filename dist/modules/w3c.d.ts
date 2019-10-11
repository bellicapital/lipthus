declare const w3c: {
    results: {};
    getUrl(this: any, uri: string): string;
    get(uri: string, sec: number): Promise<any>;
    ajaxErrorCount(uri: string): any;
    validate(uri: string): any;
    cach(uri: string, content: any): Promise<any>;
    getCached(uri: string): Promise<any>;
};
export default w3c;
