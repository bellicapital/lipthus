"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../lib");
const fs = require('mz/fs');
const debug = require('debug')('site:page');
exports.name = 'page';
function getSchema() {
    const s = new lib_1.LipthusSchema({
        active: { type: Boolean, default: true },
        type: String,
        userLevel: { type: Number, min: 0 },
        contentType: { type: String, default: "text/html; charset=UTF-8" },
        expires: Date,
        url: { type: String, default: '' },
        debugImgRef: String,
        key: String,
        route: String,
        weight: { type: Number, min: 0, default: 0 },
        title: lib_1.LipthusSchemaTypes.Multilang,
        pageTitle: lib_1.LipthusSchemaTypes.Multilang,
        metaKeywords: lib_1.LipthusSchemaTypes.Multilang,
        metaDescription: lib_1.LipthusSchemaTypes.Multilang,
        menu: { type: Boolean, default: true },
        sitemap: { type: Boolean, default: false },
        theme: { type: String, default: "default" },
        robots: String,
        forceSSL: { type: Boolean, default: false },
        noCache: { type: Boolean, default: true },
        video: lib_1.LipthusSchemaTypes.Fs,
        image: { type: lib_1.LipthusSchemaTypes.BdfList, noWatermark: true },
        html: String
    }, {
        collection: 'pages',
        lastMod: true
    });
    s.methods = {
        display: function (req, res, next) {
            const route = req.site.dir + '/routes/' + (this.route || this.key);
            this.check(req)
                .then(() => res.htmlPage.init(this.toObject()))
                .then(() => {
                if (this.html)
                    return this._display(res).catch(next);
                return fs.access(route + '.js', fs.constants.R_OK)
                    .then(() => {
                    const result = require(route).call(this, req, res, err => {
                        debug('Page route callback is deprecated. Return Promise.');
                        if (err && err instanceof Error)
                            return next(err && err.http_code === 404 ? null : err);
                        this._display(res).catch(next);
                    });
                    if (result instanceof Promise)
                        return result.then(this._display.bind(this, res), next);
                }
                // file does not exists -> display default
                , () => this._display(res));
            })
                .catch(next);
        },
        _display: function (res) {
            res.timer.end('page');
            return res.htmlPage.send();
        },
        check: function (req) {
            if (!req.ml.translateAvailable())
                return Promise.resolve();
            const keys = ['metaKeywords', 'pageTitle', 'title', 'metaDescription'];
            const promises = keys.map(k => this[k] && this[k].getLangOrTranslate(req.ml.lang));
            return Promise.all(promises);
        }
    };
    return s;
}
exports.getSchema = getSchema;
