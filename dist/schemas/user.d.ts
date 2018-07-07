import { LipthusSchema } from "../lib";
import { Document, Model } from "mongoose";
declare namespace LipthusUser {
    const name = "user";
    function getSchema(): LipthusSchema;
    interface User extends Document {
        key: string;
        uname: string;
        name: string;
        value: any;
        expire: Date;
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
    interface UserModel extends Model<User> {
        fromOAuth2(params: any): Promise<any>;
        findAndGetValues(params: any): Promise<any>;
        findAndGetValues4Show(params: any): Promise<any>;
    }
}
export = LipthusUser;
