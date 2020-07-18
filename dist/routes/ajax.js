"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AjaxMiddleware = exports.AjaxError = void 0;
const modules_1 = require("../modules");
class AjaxProcess extends modules_1.AjaxGlobalMethods {
    constructor(req) {
        super(req);
    }
    static sanitizeArgs(a, req) {
        switch (typeof a) {
            case 'string':
                switch (a) {
                    case 'false':
                        a = false;
                        break;
                    case 'true':
                        a = true;
                        break;
                    case 'req':
                        a = req;
                        break;
                    case 'uid':
                        a = req.user;
                        break;
                }
                break;
            case 'object':
                if (a instanceof Array)
                    a = a.map(ele => AjaxProcess.sanitizeArgs(ele, req));
                break;
        }
        return a;
    }
    process() {
        this.init();
        return this.req.getUser()
            .then(this.route.bind(this));
    }
    init() {
        this.query = Object.keys(this.req.body).length ? this.req.body : this.req.query;
        if (this.query.j)
            this.query = JSON.parse(this.query.j);
        const q = this.query;
        q.cl = q.cl || q.classname;
        q.m = q.m || q.method;
        q.s = q.s || q.schema;
        q.p = q.p || q.plugin;
        q.db = q.db || this.req.db.toString();
        this.processArguments();
    }
    processArguments() {
        const q = this.query;
        const reqRequiredMethods = ['rate', 'vote', 'checkAll', 'facebookLogin'];
        if (!q.a)
            q.a = [];
        else {
            if (typeof q.a === 'string') {
                try {
                    q.a = JSON.parse(q.a);
                }
                catch (e) {
                    // process.env.NODE_ENV === 'development' && console.error(e);
                }
            }
            if (!Array.isArray(q.a))
                q.a = [q.a];
            q.a = AjaxProcess.sanitizeArgs(q.a, this.req);
        }
        if (q.req || reqRequiredMethods.indexOf(q.m) !== -1)
            q.a.unshift(this.req);
    }
    route() {
        const q = this.query;
        if (q.s)
            return this.processSchema();
        const req = this.req;
        // plugin
        if (q.p)
            return req.site[q.p][q.m](...q.a);
        let func;
        if (q.g)
            return this[q.g].apply(this, q.a);
        if (q.md)
            func = require(req.site.dir + '/routes/' + q.md + '/' + (q.c || 'ajax'))[q.m];
        else if (q.cl) {
            try {
                func = require(req.site.dir + '/modules/' + q.cl);
            }
            catch (e) {
                try {
                    func = require('../modules/' + q.cl);
                }
                catch (e) {
                    func = req.app.getModule(q.cl);
                }
            }
            func = func[q.m];
        }
        else {
            try {
                func = require(req.site.dir + '/routes/ajax')[q.m];
            }
            catch (err) {
                // try {
                // 	func = require(req.site.dir + '/routes/manager/ajax').init;
                // } catch(err){}
            }
        }
        if (!func)
            return Promise.reject(new AjaxError(q.m ? 'Method ' + q.m + ' not found' : 'Bad Request', 400));
        return func.apply(this, q.a);
    }
    processSchema() {
        return new Promise((resolve, reject) => {
            const q = this.query;
            const schema = this.req.site.dbs[q.db][q.s];
            if (!schema)
                return reject(new Error('Schema ' + q.s + ' not found'));
            function oldCompat(err, r) {
                if (err)
                    reject(err);
                else
                    resolve(r);
            }
            function finish(p) {
                if (!p)
                    return;
                if (p instanceof Promise)
                    return p.then(resolve, reject);
                resolve(p);
            }
            if (q.id) {
                return schema.findById(q.id).then((obj) => {
                    if (!obj)
                        return reject(new Error('Object ' + q.s + '.' + q.id + ' not found'));
                    if (!obj[q.m])
                        return reject(new AjaxError('Method ' + q.m + ' not found', 501));
                    if (q.direct)
                        resolve(obj[q.m].apply(obj, q.a));
                    else
                        return finish(obj[q.m].apply(obj, q.a.concat([oldCompat])));
                });
            }
            else if (!schema[q.m])
                reject(new Error('Method "' + q.s + '.' + q.m + '" does not exists'));
            else
                return finish(schema[q.m].apply(schema, q.a.concat([oldCompat])));
        });
    }
}
class AjaxError extends Error {
    constructor(msg, code) {
        super(msg);
        this.statusCode = code;
    }
}
exports.AjaxError = AjaxError;
function AjaxMiddleware(req, res) {
    new AjaxProcess(req).process()
        .then(res.json.bind(res))
        .catch(err => {
        req.logError(err)
            .catch(console.error.bind(console));
        if (err.statusCode && err.statusCode !== 200)
            res.status(err.statusCode).send(err.message || err);
        else
            res.json({ error: err.message, errors: err.errors });
    });
}
exports.AjaxMiddleware = AjaxMiddleware;
