import {LipthusSchema, LipthusSchemaTypes} from "../lib";
import {Document} from "mongoose";
import {MultilangText} from "../modules/schema-types/mltext";
import {User} from "./user";
import {LipthusModel} from "../lib/lipthus-model";


export const name = 'notification';

// noinspection JSUnusedGlobalSymbols
export function getSchema() {
	const s = new LipthusSchema({
		tag: String,
		subject: String,
		content: String,
		url: String,
		uid: {type: LipthusSchemaTypes.ObjectId, ref: 'user'},
		from: {type: LipthusSchemaTypes.ObjectId, ref: 'user'},
		seen: Boolean,
		read: Boolean,
		extra: {}
	}, {
		collection: 'notifications',
		created: true
	});

	const methods: any = NotificationMethods.prototype;
	Object.getOwnPropertyNames(methods).filter(pn => pn !== 'constructor').forEach(k => s.methods[k] = methods[k]);

	const statics: any = NotificationStatics.prototype;
	Object.getOwnPropertyNames(statics).filter(pn => pn !== 'constructor').forEach(k => s.statics[k] = statics[k]);

	return s;
}

export interface Notification extends Document, NotificationMethods {
	code: string;
	title: { [s: string]: MultilangText };
}

export interface NotificationModel extends LipthusModel<Notification>, NotificationStatics {
}

export class NotificationMethods {
}

export class NotificationStatics {
	user(this: NotificationModel, user: User) {
		return this.find({uid: user})
			.select('-uid')
			.sort({created: -1});
	}

	// noinspection JSUnusedGlobalSymbols
	userTotalCount(this: NotificationModel, user: User) {
		return this.countDocuments({uid: user});
	}

	// noinspection JSUnusedGlobalSymbols
	userUnread(this: NotificationModel, user: User) {
		return this.countDocuments({uid: user, read: {$ne: true}});
	}

	// noinspection JSUnusedGlobalSymbols
	userUnseen(this: NotificationModel, user: User) {
		return this.countDocuments({uid: user, seen: {$ne: true}});
	}

	// noinspection JSUnusedGlobalSymbols
	resetUserNoti(this: NotificationModel, user: User) {
		return this.updateMany({uid: user, seen: {$ne: true}}, {$set: {seen: true}});
	}
}
