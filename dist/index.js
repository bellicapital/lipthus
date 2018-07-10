"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
require("./lib/vanilla.extensions");
require("./lib/global.l");
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
__export(require("./modules"));
__export(require("./lib"));
var mongoose_1 = require("mongoose");
exports.Types = mongoose_1.Types;
var express_1 = require("express");
exports.Router = express_1.Router;
var lipthus_error_1 = require("./classes/lipthus-error");
exports.LipthusError = lipthus_error_1.LipthusError;
exports.nodeModule = (key) => require(key);
