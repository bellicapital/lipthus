import { LipthusSchema } from "../lib";
import { Document, Model } from "mongoose";
export declare const name = "user";
export declare function getSchema(): LipthusSchema;
export interface User extends Document {
    key: string;
    uname: string;
    name: string;
    level: number;
    cart: any;
    email: string;
    phone: Array<string>;
    address: any;
    devices: Array<any>;
    subscriptions: any;
    fromOAuth2(params: any): Promise<any>;
    getImage(width: number, height?: number): string;
    subscribe2Item(ref: any): Promise<any>;
    getName(usereal?: boolean): string;
    baseInfo(includeEmail?: boolean): any;
}
export interface UserModel extends Model<User> {
    fromOAuth2(params: any): Promise<any>;
    findAndGetValues(params: any): Promise<any>;
    findAndGetValues4Show(params: any): Promise<any>;
}
