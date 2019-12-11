"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
function PaypalResponse(req) {
    const post = req.body;
    if (!post.test) {
        const log = JSON.stringify({
            date: new Date(),
            post: post,
            ip: req.ip
        }, null, '\t');
        fs_1.writeFile(req.site.dir + '/paypalresponse_log.json', log, err => err && console.error(err));
    }
}
exports.default = PaypalResponse;
