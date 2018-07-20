import { Document, Model } from 'mongoose';
import { LipthusSchema } from "../lib";
export declare const name = "tmp";
export declare function getSchema(): LipthusSchema;
export interface Tmp extends Document {
    key: string;
    value: any;
    expire: Date;
}
export interface TmpModel extends Model<Tmp> {
    get(key: string): Promise<any>;
    set(key: string, value: any, expire?: Date): Promise<any>;
    getSet(key: string, getter: any): Promise<any>;
}
