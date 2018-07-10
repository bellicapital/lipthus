"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const Url = require("url");
const https = require("https");
const http = require("http");
const ObjectId = mongoose_1.Types.ObjectId;
var util;
(function (util) {
    class CastErr404 extends Error {
        constructor(v) {
            super('ObjectId ' + v + ' is not valid');
            this.status = 404;
        }
    }
    CastErr404.code = 404;
    util.CastErr404 = CastErr404;
    function objectIdMw(req, res, next) {
        const id = req.params.id || req.query.id;
        return next(ObjectId.isValid(id) ? null : new CastErr404(id));
    }
    util.objectIdMw = objectIdMw;
    function urlContent(url, encoding) {
        return new Promise((resolve, reject) => {
            if (typeof url === 'string')
                url = Url.parse(url);
            const p = url.protocol === 'https:' ? https : http;
            p.get(url, (response) => {
                if (encoding)
                    response.setEncoding(encoding);
                let body = '';
                response.on('data', d => body += d);
                response.on('end', () => resolve(body));
            })
                .on('error', (err) => {
                // handle errors with the request itself
                console.error('Error with the request:', err.message);
                reject(err);
            });
        });
    }
    util.urlContent = urlContent;
})(util = exports.util || (exports.util = {}));
