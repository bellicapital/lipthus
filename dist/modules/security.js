"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lipthus_error_1 = require("../classes/lipthus-error");
class Security {
    constructor(req) {
        this.req = req;
        Object.defineProperties(this, {
            req: { value: req }
        });
    }
    // noinspection JSMethodCanBeStatic
    csrf(cb) {
        // const csrf = this.req.app.get('csrf');
        cb();
        // csrf(this.req, this.req.res, cb);
    }
}
var security;
(function (security) {
    function main(req, res, next) {
        let bi = req.app.get('blockedIps');
        const throwMsg = (msg) => {
            if (!bi) {
                bi = [];
                req.app.set('blockedIps', bi);
            }
            // bloquear
            // bi.push(req.ip);
            const err = new lipthus_error_1.LipthusError('Security alert! Detected: "' + msg + '"');
            err.status = 400;
            err.type = 'security';
            return next(err);
        };
        if (bi && bi.indexOf(req.ip) > -1)
            return next(new Error('blocked ip ' + req.ip));
        if (req.path.indexOf("/resource") === 0)
            return throwMsg('attack');
        if (req.path.indexOf("/wp-") !== -1)
            return throwMsg('attack');
        if (/^\/(\.php|default)/.test(req.path))
            return throwMsg('attack');
        const referer = req.get('referer');
        if (referer && referer.indexOf("/wp-") !== -1)
            return throwMsg('attack');
        req.security = new Security(req);
        if (req.site.conf.origin !== false) {
            const origin = req.site.conf.origin || req.headers.origin || '*';
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, X-HTTP-Method-Override, Content-Type, Authorization, Accept');
        }
        // intercept OPTIONS method
        if ('OPTIONS' === req.method) {
            res.header('Access-Control-Max-Age', '86400'); // 24 hours
            res.writeHead(200);
            return res.end();
        }
        next();
    }
    security.main = main;
})(security = exports.security || (exports.security = {}));
