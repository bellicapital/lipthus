import { LipthusSchema } from "../lib";
import { LipthusRequest } from "../index";
export declare const name = "comment";
export declare function getSchema(): LipthusSchema;
export declare class User {
    _id: any;
    created?: Date;
    name: string;
    text: string;
    iplocation?: any;
    answers?: Array<any>;
    ref?: any;
    db: any;
    jsonInfo: any;
    values4show(): {
        id: any;
        created: string;
        name: string;
        text: string;
        city: any;
        answers: any[] | undefined;
    };
    getHash(): any;
    getItem(fields: Array<string>): any;
    approve(req: LipthusRequest, val: boolean): any;
    values4Edit(): any;
}
