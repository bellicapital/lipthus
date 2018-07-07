import { LipthusSchema } from "../lib";
import { Site } from '../modules';
import { Document, Model } from "mongoose";
export declare const name = "config";
export declare function getSchema(site: Site): LipthusSchema;
export interface Config extends Document {
    query: string;
    created?: Date;
    name: string;
    value: any;
}
export interface ConfigModel extends Model<Config> {
}
