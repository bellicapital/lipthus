"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Translator = void 0;
const googleTranslator_1 = require("./googleTranslator");
const langname = require('local-lang-names');
class Translator {
    constructor(site) {
        this.site = site;
        const config = site.config;
        this.tmp = site.db.tmp;
        this.cache = site.db.translatorCache;
        this.logger = site.db.loggerTranslator;
        this.service = config.translate_service;
        switch (this.service) {
            case 'google':
                if (config.googleApiKey)
                    this.client = new googleTranslator_1.GoogleTranslator(config.googleApiKey);
                break;
        }
        site.translator = this;
    }
    availableLangs() {
        if (this._availableLangs)
            return Promise.resolve(this._availableLangs);
        if (!this.client)
            return Promise.reject(new Error('No client available'));
        return this.tmpNames()
            .then(availableLangs => {
            if (availableLangs)
                return this._availableLangs = availableLangs;
            return new Promise((ok, ko) => {
                if (!this.client)
                    return ko(new Error('No tranlator client'));
                this.client.availableLangs((err, availableLangs2) => {
                    if (err)
                        return ko(err);
                    this._availableLangs = {};
                    console.log('Updating available language names');
                    availableLangs2.forEach(code => {
                        if (!(this._availableLangs[code] = langname(code))) {
                            switch (code) {
                                case 'iw':
                                    this._availableLangs.he = langname('he');
                                    break;
                                case 'jw':
                                    this._availableLangs.jw = 'Javanese';
                                    break;
                                case 'ceb':
                                    this._availableLangs.ceb = 'Sinugboanon'; // ???
                                    break;
                                case 'hmn':
                                    this._availableLangs.hmn = 'Hmong'; // ????
                                    break;
                                default:
                                    console.warn('Langcode "' + code + '" name not found');
                            }
                        }
                    });
                    this.tmp.set(this.service + 'AvailableLangs', this._availableLangs)
                        .catch((errTmp) => console.error(errTmp));
                    ok(this._availableLangs);
                });
            });
        });
    }
    translate(src, from, to, cb, srclog) {
        if (from === to)
            return cb(new Error('Translate from ' + from + ' to ' + to + '? ;-)'));
        const src2 = typeof src === 'string' ? [src] : src;
        const toTranslateIdx = [];
        const toTranslate = [];
        const ret = [];
        this.cache.get(src2, from, to, (err, cached) => {
            if (err)
                return cb(err);
            cached.forEach((c, idx) => {
                if (!c) {
                    toTranslateIdx.push(idx);
                    toTranslate.push(src2[idx]);
                }
                else
                    ret[idx] = c;
            });
            if (!toTranslate.length)
                return cb(null, typeof src === 'string' && ret ? ret[0] : ret);
            this.logger.log(toTranslate, to, this.service, null, srclog, (err2, log) => {
                if (!this.client)
                    err2 = new Error('Translator client not defined');
                if (err2)
                    return cb(err2);
                this.client.translate(toTranslate, from, to, (err3, result) => {
                    log.setDone(!err3);
                    if (result) {
                        result.forEach((r, idx) => {
                            if (r)
                                this.cache.set(src2[toTranslateIdx[idx]], from, to, r);
                            ret[toTranslateIdx[idx]] = r;
                        });
                    }
                    cb(err3, typeof src === 'string' && ret ? ret[0] : ret);
                });
            });
        });
    }
    /**
     * Obtiene una copia temporal de los nombres locales de los idiomas disponibles
     */
    tmpNames() {
        return this.tmp.get(this.service + 'AvailableLangs')
            .then(tmp => {
            const ret = tmp && tmp.get('value');
            // si hace más de tres meses de la ultima consulta, lo eliminamos
            if (tmp && tmp.modified && tmp.modified.getTime() < Date.now() - 3600000 * 24 * 7 * 30 * 3) {
                // expired
                tmp.remove();
            }
            return ret;
        });
    }
    langNames(lang, cb) {
        this._langNames(lang, (err, names) => {
            if (!err && names)
                return cb(err, names);
            err.message = 'Can\'t get service lang names. Using defaults. Service Error (' + this.service + '): ' + err.message;
            cb(err, require('./langNames'));
        });
    }
    _langNames(lang, cb) {
        const key = this.service + 'AvailableLangs_' + lang;
        this.tmp.get(key)
            .then(tmp => {
            if (tmp) {
                // si hace menos de seis meses de la ultima consulta, continuamos
                if (!tmp.modified || tmp.modified.getTime() > Date.now() - 3600000 * 24 * 7 * 30 * 6) {
                    // not expired
                    return cb(null, tmp.get('value'));
                }
            }
            return this.availableLangs()
                .then(langs => {
                this.client.langNames(lang, Object.keys(langs), (err, names) => {
                    if (err)
                        return cb(err);
                    this.tmp.set(key, names)
                        .then(() => cb(null, names));
                });
            });
        })
            .catch(cb);
    }
}
exports.Translator = Translator;
