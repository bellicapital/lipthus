import { LipthusSchema } from "../lib";
import { Document } from "mongoose";
import { MultilangText } from "../modules/schema-types/mltext";
import { User } from "./user";
import { LipthusModel } from "../lib/lipthus-model";
export declare const name = "notification";
export declare function getSchema(): LipthusSchema;
export interface Notification extends Document, NotificationMethods {
    code: string;
    title: {
        [s: string]: MultilangText;
    };
}
export interface NotificationModel extends LipthusModel<Notification>, NotificationStatics {
}
export declare class NotificationMethods {
}
export declare class NotificationStatics {
    user(this: NotificationModel, user: User): import("mongoose").DocumentQuery<Notification[], Notification, {}>;
    userTotalCount(this: NotificationModel, user: User): import("mongoose").Query<number>;
    userUnread(this: NotificationModel, user: User): import("mongoose").Query<number>;
    userUnseen(this: NotificationModel, user: User): import("mongoose").Query<number>;
    resetUserNoti(this: NotificationModel, user: User): import("mongoose").Query<any>;
}
