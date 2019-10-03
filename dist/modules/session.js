"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const session = require('express-session');
const MongoDBStore = require("connect-mongodb-session")(session);
exports.default = (site) => {
    const { uri, options } = site.authDb.connectParams();
    const expires = 1000 * 60 * 60 * 24 * (site.config.sessionExpireDays || 0);
    site.store = new MongoDBStore({
        uri: uri,
        connectionOptions: options,
        collection: 'sessions',
        expires: expires
    });
    const params = {
        secret: site.secret,
        cookie: {
            maxAge: expires
        },
        store: site.store,
        name: site.key + ".sid",
        resave: false,
        saveUninitialized: false,
        unset: 'destroy'
    };
    const sessionMW = session(params);
    return (req, res, next) => {
        if (req.device.type === 'bot') {
            req.session = {};
            return next();
        }
        sessionMW(req, res, next);
    };
};
