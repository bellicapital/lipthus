"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodeModule = exports.LipthusWebSocketServer = exports.LipthusError = exports.CachedFile = exports.Router = exports.Types = exports.lipthusSite = void 0;
const Debug = require("debug");
require("./lib/vanilla.extensions");
const modules_1 = require("./modules");
const debug = Debug('site:lipthus');
debug('Loading modules. Please wait...');
if (!process.env.NODE_ENV)
    process.env.NODE_ENV = 'development';
if (!process.env.TMPDIR)
    process.env.TMPDIR = process.env.TMPDIR || '/tmp/';
if (process.env.TMPDIR.substr(-1) !== '/')
    process.env.TMPDIR += '/';
process.on('warning', (warning) => {
    console.warn(warning.name);
    console.warn(warning.message);
    console.warn(warning.stack);
});
process.on('unhandledRejection', (reason, p) => console.log('Unhandled Rejection at: Promise', p, 'reason:', reason));
// noinspection JSUnusedGlobalSymbols
function lipthusSite(dir, options) {
    return new Promise((ok, ko) => {
        const site = new modules_1.Site(dir, options);
        site.on('ready', () => ok(site));
        site.on('error', ko);
    });
}
exports.lipthusSite = lipthusSite;
__exportStar(require("./modules"), exports);
__exportStar(require("./lib"), exports);
var mongoose_1 = require("mongoose");
Object.defineProperty(exports, "Types", { enumerable: true, get: function () { return mongoose_1.Types; } });
var express_1 = require("express");
Object.defineProperty(exports, "Router", { enumerable: true, get: function () { return express_1.Router; } });
var cached_file_1 = require("./classes/cached-file");
Object.defineProperty(exports, "CachedFile", { enumerable: true, get: function () { return cached_file_1.CachedFile; } });
var lipthus_error_1 = require("./classes/lipthus-error");
Object.defineProperty(exports, "LipthusError", { enumerable: true, get: function () { return lipthus_error_1.LipthusError; } });
var web_socket_server_1 = require("./classes/web-socket-server");
Object.defineProperty(exports, "LipthusWebSocketServer", { enumerable: true, get: function () { return web_socket_server_1.LipthusWebSocketServer; } });
// noinspection JSUnusedGlobalSymbols
exports.nodeModule = (key) => require(key);
