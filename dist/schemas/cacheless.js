"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debug0 = require("debug");
const fs_1 = require("fs");
const lib_1 = require("../lib");
const path = require('path');
const less = require('less');
const md5 = require('md5');
const debug = debug0('site:css');
exports.name = "cacheless";
// noinspection JSUnusedGlobalSymbols
function getSchema() {
    const s = new lib_1.LipthusSchema({
        mtime: Number,
        source: { type: String, index: true, unique: true },
        compress: Boolean,
        varsmd5: String,
        content: {}
    }, {
        collection: 'cache.less'
    });
    s.statics = {
        getCachedFile: function (file, compress) {
            return fs_1.promises.stat(file)
                .then(stat => this.getCached({
                src: file,
                compress: compress,
                code: '@import "' + file + '";',
                mtime: stat.mtime.getTime() / 1000,
                mapUrl: path.basename(file, '.less') + '.map'
            }));
        },
        getCachedFiles: function (files, basename) {
            let code = '';
            let mtime = 0;
            const promises = [];
            files.forEach(file => {
                promises.push(fs_1.promises.stat(file));
                code += '@import "' + file + '";';
            });
            return Promise.all(promises)
                .then(v => {
                v.forEach(stat => {
                    const smt = stat.mtime.getTime();
                    if (smt > mtime)
                        mtime = smt;
                });
                mtime = Math.floor(mtime / 1000);
                return this.getCached({
                    src: basename,
                    compress: true,
                    code: code,
                    mtime: mtime,
                    mapUrl: '/css/' + basename + '.' + mtime + '.map'
                });
            }, err => {
                if (err.code === 'ENOENT') {
                    err.status = 404;
                    debug(err.message);
                }
                throw err;
            });
        },
        getCached: function (opt) {
            const src = opt.src;
            const compress = opt.compress;
            const mtime = opt.mtime;
            const db = this.db.lipthusDb;
            const mapUrl = opt.mapUrl;
            const site = db.site;
            return db.cacheless
                .findOne({ source: src })
                .then(cached => {
                const lessVars = site.lessVars();
                const varsmd5 = md5(JSON.stringify(lessVars));
                if (cached
                    && cached.mtime >= mtime
                    && cached.compress === compress
                    && cached.varsmd5 === varsmd5)
                    return cached.content;
                const lessopt = {
                    compress: compress,
                    globalVars: lessVars,
                    sourceMap: { sourceMapURL: mapUrl },
                    sourceMapMapInline: true
                };
                return less.render(opt.code, lessopt)
                    .then(r => {
                    const update = {
                        source: src,
                        mtime: mtime,
                        varsmd5: varsmd5,
                        content: r,
                        compress: compress
                    };
                    return db.cacheless.updateOne({ source: src }, update, { upsert: true })
                        .then(() => r);
                }, err => {
                    throw new Error('Less render - ' + err.message + '\n' + JSON.stringify(err, null, '\t'));
                });
            });
        }
    };
    return s;
}
exports.getSchema = getSchema;
