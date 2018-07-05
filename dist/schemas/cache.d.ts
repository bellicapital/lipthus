/// <reference types="node" />
import { LipthusSchema } from "../lib";
import { Model } from "mongoose";
import { LipthusDocument } from "../interfaces/lipthus-document";
export declare const name = "cache";
export declare function getSchema(): LipthusSchema;
export interface LipthusCache extends LipthusDocument {
    name: string;
    expires: Date;
    contentType: string;
    tag: string;
    mtime: Date;
    MongoBinData: Buffer;
    source: string;
    srcmd5: string;
    ref: any;
    width: number;
    height: number;
    crop: boolean;
    size: number;
    wm: any;
    created: Date;
    modified: Date;
}
export interface LipthusCacheModel extends Model<LipthusCache> {
}
