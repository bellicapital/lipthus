import { Site } from "./site";
export declare class Mailer {
    site: Site;
    transport: any;
    constructor(conf: any, site: Site);
    send(opt: any): any;
    checkOptions(opt: any): void;
    ensureFrom(opt: any): void;
    ensureForceEmbeddedImages(opt: any): void;
}
