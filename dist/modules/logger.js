"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const botRe = /^\/(videos|bdf|resimg|optimg|ajax\/|c\/|cache|admin|form-log|responsive|bot)/;
class LipthusLogger {
    constructor(req) {
        this.req = req;
        Object.defineProperty(req, 'logger', { value: this });
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
    notfoundArray(cb) {
        return this.collection('notfound').distinct('url', cb);
    }
    notfoundDetails(a, cb) {
        this.collection('notfound').find({ url: a }).toArray(cb);
    }
    notfoundRemove(a, cb) {
        this.collection('notfound').deleteOne({ url: a }, cb);
    }
    static init(app) {
        app.db.collection('logger.updates')
            .createIndex({ itemid: 1 })
            .catch(console.warn.bind(console));
        app.use(LipthusLogger.middleware);
        if (app.site.config.botLog)
            app.use(LipthusLogger.botMiddleware);
    }
    static middleware(req, res, next) {
        req.session.debug = parseInt(req.body.debug || req.query.debug || req.session.debug, 10) || 0;
        const logger = new LipthusLogger(req);
        req.logError = logger.logError.bind(logger);
        next();
    }
    static botMiddleware(req, res, next) {
        // req.device.type = 'bot';
        // req.headers['user-agent'] = "Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)";
        if (req.device.type !== 'bot' || botRe.test(req.path))
            return next();
        req.db.botlog
            .log(req)
            .then(() => next())
            .catch(next);
    }
    // Ajax helpers
    static notfoundArray(req, res, cb) {
        return req.logger.notfoundArray(cb);
    }
    static notfoundDetails(req, res, a, cb) {
        req.logger.notfoundDetails(a, cb);
    }
    static notfoundRemove(req, res, a, cb) {
        req.logger.notfoundRemove(a, cb);
    }
}
exports.LipthusLogger = LipthusLogger;
