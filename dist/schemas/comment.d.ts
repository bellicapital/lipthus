import { LipthusSchema } from "../lib";
import { LipthusRequest } from "../index";
import { Document, Model, Types } from "mongoose";
export declare const name = "comment";
export interface Answer {
    active: boolean;
    name: string;
    created: Date;
    submitter?: Types.ObjectId;
    text: string;
    iplocation?: any;
}
export interface IpLocation {
    ip: string;
    area_code?: string;
    dma_code?: string;
    longitude?: number;
    latitude?: number;
    postal_code?: string;
    city?: string;
    region?: string;
    country_name?: string;
    country_code3?: string;
    country_code?: string;
    continent_code?: string;
}
export declare function getSchema(): LipthusSchema;
export declare class Comment {
    _id: any;
    active?: boolean;
    refused?: boolean;
    email: string;
    name: string;
    text: string;
    lang: string;
    iplocation?: IpLocation;
    answers?: Array<Answer>;
    ref?: any;
    itemTitle: string;
    jsonInfo: any;
    url?: string;
    userAgent?: string;
    rating?: number;
    created?: Date;
    lastMod?: Date;
    userLocation?: string;
    values4show(): {
        id: any;
        created: string;
        name: string;
        text: string;
        rating: number;
        city: string;
        answers: Answer[];
    };
    getHash(): any;
    getItem(fields: any): any;
    approve(req: LipthusRequest, val: boolean): any;
    values4Edit(): any;
    static find4show(this: LipthusCommentModel, query: any, limit?: number): Promise<any[]>;
    static submit(this: LipthusCommentModel, req: LipthusRequest, dbName: string, colname: string, itemid: any, uname: string, email: string, text: string): Promise<any>;
    static countById(this: LipthusCommentModel, query: any): Promise<any>;
    static colcount(this: LipthusCommentModel, cb: any): void;
    static colCountIncPending(this: LipthusCommentModel): Promise<any>;
    static googleVisualizationList(this: LipthusCommentModel, req: LipthusRequest, colname: string, limit?: number, skip?: number): Promise<any>;
    static byColname(this: LipthusCommentModel, colname: string, query: any, options?: any): Promise<any>;
    static byColnameIncItemTitle(this: LipthusCommentModel, colname: string, query: any, options: any): any;
}
export interface LipthusComment extends Comment, Document {
}
export interface LipthusCommentModel extends Model<LipthusComment> {
}
