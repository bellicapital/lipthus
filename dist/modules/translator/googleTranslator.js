"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api = require('google-translate');
class GoogleTranslator {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.gt = api(apiKey);
    }
    // noinspection JSUnusedGlobalSymbols
    availableLangs(cb) {
        this.gt.getSupportedLanguages((err, result) => {
            if (err)
                return cb(err);
            const ret = [];
            result.forEach((o) => ret.push(o.language));
            return cb(null, ret);
        });
    }
    translate(src, from, to, cb) {
        this.gt.translate(src, from, to, (err, r) => {
            if (err)
                return cb(typeof err === 'string' ? new Error(err) : err);
            if (!r)
                return cb(new Error('Empty translate'));
            if (!Array.isArray(r))
                r = [r];
            const ret = [];
            // remove u200B ZERO WIDTH SPACE
            r.forEach(t => ret.push(t.translatedText ? t.translatedText.replace(/\u200B/g, '') : ''));
            return cb(null, ret);
        });
    }
    /**
     *
     * @param {string} target Lang code
     * @param {Array} codes Usado para compatibilidad con azure
     * @param {function} cb
     * @returns {undefined}
     */
    langNames(target, codes, cb) {
        this.gt.getSupportedLanguages(target, (err, result) => {
            if (err)
                return cb(err);
            const ret = {};
            result.data.languages.forEach((o) => ret[o.language] = o.name);
            if (target === 'ur' && !ret.ur)
                ret.ur = 'اردو';
            return cb(undefined, ret);
        });
    }
}
exports.GoogleTranslator = GoogleTranslator;
