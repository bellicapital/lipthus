"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Url = require("url");
const https = require("https");
const http = require("http");
var util;
(function (util) {
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
