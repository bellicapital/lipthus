"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const s = require('express-session');
const MongoStore = require("connect-mongo")(s);
exports.session = (site) => {
    site.store = new MongoStore({ mongooseConnection: site.db._conn });
    const params = {
        secret: site.secret,
        cookie: {
            maxAge: 60000 * 60 * 24 * 5 // cinco dias
        },
        store: site.store,
        name: site.key + ".sid",
        resave: false,
        saveUninitialized: false,
        unset: 'destroy'
    };
    const sessionMW = s(params);
    return (req, res, next) => {
        if (req.device.type === 'bot') {
            req.session = {};
            return next();
        }
        sessionMW(req, res, next);
    };
};
