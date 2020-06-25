"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const multipart = require('multer')({ dest: os.tmpdir() }).any();
exports.default = (req, res, next) => {
    req.multipart = () => new Promise((ok, ko) => multipart(req, res, (err, r) => {
        if (err)
            ko(err);
        else
            ok(r);
    }));
    next();
};
