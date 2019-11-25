"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EucaForm = require('../modules/form');
exports.default = (req, res) => {
    EucaForm.processReq(req)
        .then((r) => res.json(r))
        .catch((err) => {
        res.json({ error: err.message || err });
        console.error(err);
    });
};
