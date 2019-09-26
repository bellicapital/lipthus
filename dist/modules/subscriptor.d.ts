import { LipthusDb } from "./db";
export declare class Subscriptor {
    app: any;
    models: any;
    static init(app: any): Subscriptor;
    constructor(app: any);
    subscribeDb(db: LipthusDb): void;
    summary(): any;
    /**
     *
     * @param {String} model
     * @param {String} [value="newItem"]
     * @param {String} [type="events"]
     * @param {String} [dbName=this.app.site.db]
     * @returns {Promise}
     */
    subscriptorsCount(model: any, value?: string, type?: string, dbName?: string): any;
    getSubscriptors(dbName: string, model: any, type: string, value: any, onlyUsers?: boolean): any;
    manageComments(): void;
    subscribeModel(name: string, db?: any): any;
    getItemScript(name: string): any;
    _onItemCreated(item: any, name: string, db: LipthusDb): any;
    _onItemActivated(item: any, name: string, db: LipthusDb): void;
    userConfirm(id: any): any;
    getItemOptions(schema: string, item: any, cb: any): any;
    /**
     *
     * @param {String} email
     * @returns {Promise}
     */
    unsubscribe(email: string): any;
    newComment(comment: any, item: any): any;
    log(event: string, email: string, content?: any, lang?: string): void;
    static ajaxRemoveUserItem(req: any, res: any, uid: any, db: string, col: string, itemId: string, cb: any): any;
}
