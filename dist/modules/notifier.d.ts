import { Site } from "./site";
import { User } from "../schemas/user";
export declare class Notifier {
    site: Site;
    serverFrom: string;
    constructor(site: Site);
    /**
     * Sends a Google Cloud Message
     *
     * @param ids
     * @param values
     * @returns {Promise}
     */
    gcm(ids: Array<string>, values: any): Promise<unknown>;
    gcm_(ids: Array<string>, values: any, cb: any): any;
    toAdmin(subject: string, content: string | any, tpl: string | null, tag: string, extra?: any): any;
    toEmail(opt: any): Promise<any>;
    toUser(user: User, opt?: any): Promise<any>;
    toSubscriptors(dbName: string, model: any, type: string, value: any, onlyUsers: boolean, params: any): Promise<void>;
    itemCreated(item: any, subscribed: Array<any>, options?: any): Promise<{
        from: any;
        to: string;
        subject: any;
        html: string;
        params: any;
    }>;
    itemActivated(item: any, subscribed: Array<any>, options?: any): Promise<{
        from: any;
        to: string;
        subject: any;
        html: string;
        params: any;
    }>;
    private _processAndPreviewCommon;
    _process(item: any, subscribed: string | Array<any>, options?: any): Promise<{
        from: any;
        to: string;
        subject: any;
        html: string;
        params: any;
    }>;
    preview(item: any, options: any): Promise<{
        from: any;
        to: string;
        subject: any;
        html: string;
        params: any;
    }>;
    parseContent(lang: string, content: any, template: string): Promise<string>;
    templateFile(tpl: string, lang: string): string;
}
