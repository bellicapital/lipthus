"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LipthusLogger = void 0;
const mongoose_1 = require("mongoose");
class LipthusLogger {
    constructor(req) {
        this.req = req;
        Object.defineProperty(req, 'logger', { value: this });
    }
    static init(app) {
        app.db.collection('logger.updates')
            .createIndex({ itemid: 1 })
            .catch(console.warn.bind(console));
        app.use(LipthusLogger.middleware);
    }
    static middleware(req, res, next) {
        const logger = new LipthusLogger(req);
        req.logError = logger.logError.bind(logger);
        next();
    }
    collection(type) {
        return this.req.db.collection('logger.' + type);
    }
    log(collection, extra) {
        const obj = this.baseObj();
        if (extra)
            Object.assign(obj, extra);
        if (typeof collection === 'string')
            collection = this.collection(collection);
        return collection
            .insertOne(obj)
            .then(() => obj);
    }
    logError(err) {
        const type = err.type || 'error';
        const col = this.collection(type);
        const obj = {
            stack: err.stack,
            last: new Date()
        };
        return col.findOne({ stack: obj.stack })
            .then(error2 => {
            if (error2) {
                return col
                    .updateOne({ _id: error2._id }, { $set: { last: obj.last, repeated: ++error2.repeated } })
                    .then(() => {
                });
            }
            else {
                if (err.status)
                    obj.status = err.status;
                obj.repeated = 0;
                return this.log(type, obj).then(() => {
                });
            }
        })
            .catch((err2) => {
            console.error.bind(console);
            return err2;
        });
    }
    logNotFound() {
        return this.log('notfound');
    }
    logUpdate(obj, id, field, value) {
        if (typeof obj !== 'object') {
            obj = {
                schema_: obj,
                itemid: id,
                field: field,
                value: value
            };
        }
        if (this.req.user) {
            obj.uid = this.req.user._id || mongoose_1.Types.ObjectId('' + this.req.user);
        }
        return this.collection('updates').insertOne(obj);
    }
    count(type) {
        return this.collection(type).countDocuments({});
    }
    list(type, query, opt, cb) {
        // noinspection JSDeprecatedSymbols
        this.collection(type).find(query, opt).toArray(cb);
    }
    baseObj() {
        const req = this.req;
        const res = this.req.res;
        const ret = {
            url: req.protocol + '://' + req.get('host') + req.originalUrl,
            method: req.method,
            agent: req.get('user-agent'),
            referer: req.get('referer'),
            device: req.device ? req.device.type : 'unknown',
            ipLocation: req.ipLocation,
            created: new Date()
        };
        if (!ret.referer)
            delete ret.referer;
        if (req.method === 'POST')
            ret.postKeys = Object.keys(req.body);
        if (res.statusCode && res.statusCode !== 200)
            ret.code = res.statusCode;
        return ret;
    }
}
exports.LipthusLogger = LipthusLogger;
