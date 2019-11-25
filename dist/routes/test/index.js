"use strict";
const email_1 = require("./email");
const methods = {
    email: email_1.default
};
module.exports = (req, res, next) => {
    methods[req.params.method](req, res)
        .catch(next);
};
