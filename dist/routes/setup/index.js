"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Setup = void 0;
const mail = require("./mail-sent");
const methods = Object.assign({}, require('./main'), require('./item'), require('./config'), mail);
function Setup(req, res, next) {
    const method = methods[req.params.method];
    if (!method)
        return next(404);
    return method(req, res)
        .then((r) => res.json(r))
        .catch(next);
}
exports.Setup = Setup;
