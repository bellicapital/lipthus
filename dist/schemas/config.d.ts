import { LipthusSchema } from "../lib";
import { Site } from '../modules';
import { Document, Model } from "mongoose";
export declare const name = "config";
export declare function getSchema(site: Site): LipthusSchema;
export interface ConfigDoc extends Document {
    query: string;
    created?: Date;
    name: string;
    value: any;
    getValue: () => any;
}
export interface ConfigModel extends Model<ConfigDoc> {
}
