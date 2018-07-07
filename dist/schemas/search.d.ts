import { Document, Model } from 'mongoose';
import { LipthusSchema } from "../lib";
import { LipthusRequest } from "../index";
export declare const name = "search";
export declare function getSchema(): LipthusSchema;
export interface Search extends Document {
    query: string;
    created?: Date;
}
export interface SearchModel extends Model<Search> {
    log(req: LipthusRequest, query: any): Promise<any>;
}
