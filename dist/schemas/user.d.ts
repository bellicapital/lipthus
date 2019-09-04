import { LipthusSchema } from "../lib";
import { LipthusRequest, Site } from "../index";
import { Document, Model } from "mongoose";
export declare const name = "user";
export declare function getSchema(site: Site): LipthusSchema;
export interface User extends Document {
    key: string;
    uname: string;
    name: string;
    pass: string;
    level: number;
    cart: any;
    email: string;
    language: string;
    phone: Array<string>;
    address: any;
    devices: Array<any>;
    subscriptions: any;
    type?: string;
    email_notifications?: boolean;
    formatEmailTo?: string;
    data?: any;
    fromOAuth2(params: any): Promise<any>;
    getImage(typeOrWidth: string | number, height?: number): string;
    subscribe2Item(ref: any): Promise<any>;
    getName(useReal?: boolean): string;
    baseInfo(includeEmail?: boolean): any;
    isAdmin(): boolean;
    htmlLink(): string;
    getValues(req: LipthusRequest): Promise<any>;
    save(): Promise<any>;
}
export interface UserModel extends Model<User> {
    fromOAuth2(params: any): Promise<any>;
    findAndGetValues(params: any): Promise<any>;
    findAndGetValues4Show(params: any): Promise<any>;
}
