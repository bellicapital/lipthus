import { LipthusSchema } from "../lib";
import { Document, Model } from "mongoose";
export declare const name = "page";
export declare function getSchema(): LipthusSchema;
export interface LipthusPage extends Document {
    active: boolean;
    type: string;
    userLevel: number;
    contentType: string;
    expires: Date;
    url: string;
    debugImgRef: string;
    key: string;
    route: string;
    weight: number;
    title: any;
    pageTitle: any;
    metaKeywords: any;
    metaDescription: any;
    menu: boolean;
    sitemap: boolean;
    display: (req: any, res: any, next: any) => {};
}
export interface LipthusPageModel extends Model<LipthusPage> {
}
