import { Site } from "./site";
import { User } from "../schemas/user";
export declare class Notifier {
    site: Site;
    serverFrom: string;
    constructor(site: Site);
    /**
     * Google Chrome Cloud Messaging (chrome.gcm)
     * https://developer.chrome.com/apps/gcm
     * https://developers.google.com/cloud-messaging/gcm
     *
     * @param {type} ids
     * @param {type} values
     * @param {type} cb
     * @returns {undefined}
     */
    /**
     * Sends a Google Cloud Message
     *
     * @param ids
     * @param values
     * @returns {Promise}
     */
    gcm(ids: Array<string>, values: any): Promise<unknown>;
    gcm_(ids: Array<string>, values: any, cb: any): any;
    toAdmin(subject: string, content: string | any, tpl: string | null, tag: string, extra?: any): void;
    toEmail(opt: any, cb?: any): any;
    toUser(user: User, opt?: any): void | Promise<never>;
    toSubscriptors(dbName: string, model: any, type: string, value: any, onlyUsers: boolean, params: any): any;
    itemCreated(item: any, subscribed: Array<any>, options?: any, cb?: any): void;
    itemActivated(item: any, subscribed: Array<any>, options?: any, cb?: any): void;
    _process(item: any, subscribed: string | Array<any>, opt?: any, cb?: any): void;
    preview(item: any, options: any, cb: any): void;
    parseContent(lang: string, content: any, template: string, cb: any): void;
    templateFile(tpl: string, lang: string): string;
}
