export declare class CachedFile {
    file: string;
    params: any;
    static get(file: string, params?: any): CachedFile;
    constructor(file: string, params?: any);
    send(res: any): void;
}
