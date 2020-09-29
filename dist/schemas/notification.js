"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationStatics = exports.NotificationMethods = exports.getSchema = exports.name = void 0;
const lib_1 = require("../lib");
exports.name = 'notification';
// noinspection JSUnusedGlobalSymbols
function getSchema() {
    const s = new lib_1.LipthusSchema({
        tag: String,
        subject: String,
        content: String,
        url: String,
        uid: { type: lib_1.LipthusSchemaTypes.ObjectId, ref: 'user' },
        from: { type: lib_1.LipthusSchemaTypes.ObjectId, ref: 'user' },
        seen: Boolean,
        read: Boolean,
        extra: {}
    }, {
        collection: 'notifications',
        created: true
    });
    const methods = NotificationMethods.prototype;
    Object.getOwnPropertyNames(methods).filter(pn => pn !== 'constructor').forEach(k => s.methods[k] = methods[k]);
    const statics = NotificationStatics.prototype;
    Object.getOwnPropertyNames(statics).filter(pn => pn !== 'constructor').forEach(k => s.statics[k] = statics[k]);
    return s;
}
exports.getSchema = getSchema;
class NotificationMethods {
}
exports.NotificationMethods = NotificationMethods;
class NotificationStatics {
    user(user) {
        return this.find({ uid: user })
            .select('-uid')
            .sort({ created: -1 });
    }
    // noinspection JSUnusedGlobalSymbols
    userTotalCount(user) {
        return this.countDocuments({ uid: user });
    }
    // noinspection JSUnusedGlobalSymbols
    userUnread(user) {
        return this.countDocuments({ uid: user, read: { $ne: true } });
    }
    // noinspection JSUnusedGlobalSymbols
    userUnseen(user) {
        return this.countDocuments({ uid: user, seen: { $ne: true } });
    }
    // noinspection JSUnusedGlobalSymbols
    resetUserNoti(user) {
        return this.updateMany({ uid: user, seen: { $ne: true } }, { $set: { seen: true } });
    }
}
exports.NotificationStatics = NotificationStatics;
