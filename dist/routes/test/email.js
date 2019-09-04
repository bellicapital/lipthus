"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (req, res) => {
    // tmp solution
    if (!req.query.to)
        return res.send('hi');
    return req.site.sendMail({
        to: req.query.to,
        subject: 'Email test',
        html: 'Email test body'
    }, true)
        .then(res.send.bind(res), res.send.bind(res));
};
