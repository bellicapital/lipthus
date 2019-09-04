/// <reference types="node" />
import { LipthusSchema } from "../lib";
import { Model } from "mongoose";
import { LipthusDocument } from "../interfaces/lipthus-document";
export declare const name = "cacheResponse";
export declare function getSchema(): LipthusSchema;
export interface LipthusCacheResponse extends LipthusDocument {
    uri: string;
    device: string;
    lang: string;
    expires: Date;
    contentType: string;
    MongoBinData: Buffer;
    created: Date;
    modified: Date;
}
export interface LipthusCacheResponseModel extends Model<LipthusCacheResponse> {
}
