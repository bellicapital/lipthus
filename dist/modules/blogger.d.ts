import { LipthusRequest } from "../index";
export declare class Blogger {
    req: LipthusRequest;
    keys: Array<string>;
    size: number;
    lang: string;
    constructor(req: LipthusRequest);
    getBlogs(query: any, cb?: any): void;
    getBlog(k: string): any;
    summary(options: any, cb: any): void;
    getPosts(blog: any, options: any): any;
}
export declare class Blog {
    req: LipthusRequest;
    title: string;
    schema: string;
    collection: any;
    items?: Array<any>;
    constructor(req: LipthusRequest, k: string);
    set(k: string, v: any): this;
    getPosts(options: any): any;
    summary(options: any): any;
}
