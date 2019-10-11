"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class Multilang {
    constructor(req) {
        this.req = req;
        const site = req.site;
        this.langs = site.langs;
        this.langUrls = site.environment.urls || {};
        this.loaded = {};
        this.all = {};
        this.translator = site.translator;
        this.fblocales = require(site.lipthusDir + '/configs/fblocales'); // TODO: get from https://www.facebook.com/translations/FacebookLocales.xml
        if (req.headers) {
            this.baseHost = req.headers.host + '';
            if (/^www\./.test(this.baseHost))
                this.baseHost = this.baseHost.substr(4);
            else if (/^\w{2}\./.test(this.baseHost))
                this.baseHost = this.baseHost.substr(3);
        }
        Object.defineProperty(this, 'availableLangs', { value: Multilang.availableLangs });
        const config = site.config;
        this.configLang = config.language;
        if (site.environment.language)
            this.lang = site.environment.language;
        else {
            //noinspection JSUnresolvedVariable
            if (config.lang_subdomains && req.subdomains.length && site.availableLangs[req.subdomains[req.subdomains.length - 1]])
                this.lang = req.subdomains[req.subdomains.length - 1];
            else if (!config.lang_subdomains && req.query.hl)
                this.lang = req.query.hl;
            else
                this.lang = this.configLang;
        }
        if (!site.availableLangs[this.lang])
            this.lang = this.configLang;
    }
    static _translateAvailable(site) {
        const config = site.config;
        if (!config.auto_translate)
            return false;
        if (config.translate_service === 'azure')
            return config.azure_client_id && !!config.azure_client_secret;
        return !!config.googleApiKey;
    }
    static availableLanguages(site) {
        if (!Multilang._translateAvailable(site))
            return Promise.resolve(Multilang.availableLangs);
        return require('./translator')(site)
            .availableLangs()
            .then((a) => a)
            .catch((err) => {
            console.error(err);
            site.config.auto_translate = false;
            return Multilang.availableLangs;
        });
    }
    getLocale() {
        if (!this.locale)
            this.locale = this._getLocale();
        return this.locale;
    }
    /**
     * provisional. Se ha de realizar todo el proyecto de localización
     * @returns {String}
     */
    _getLocale() {
        if (!this.fblocales[this.lang])
            return Multilang.defaultLocale;
        const countries = Object.keys(this.fblocales[this.lang]);
        let ret = this.lang + '_';
        if (countries.length === 1)
            return ret + countries[0];
        switch (this.lang) {
            case 'en':
                return 'en_US';
            case 'zh':
                return 'zh_CN';
            case 'es':
            case 'pt':
            case 'fr':
            default:
                const country = this.lang.toUpperCase();
                return ret += this.fblocales[this.lang][country] ? country : countries[0];
        }
    }
    translateAvailable() {
        return Multilang._translateAvailable(this.req.site);
    }
    _loadArray(tags) {
        if (!tags.length)
            return Promise.resolve(this.all);
        const ret = {};
        return Promise.all(tags.map((tag) => this.load(tag).then((r) => Object.assign(ret, r))))
            .then(() => this.all);
    }
    /**
     * Carga paquetes de idioma
     *
     * @param {string|array} tag
     * @returns {Promise<{}>} todos los resultados acumulados
     */
    load(tag) {
        if (Array.isArray(tag))
            return this._loadArray(tag);
        if (this.loaded[tag])
            return Promise.resolve(this.loaded[tag]);
        return this.req.site.db.lang.load(tag, this.lang)
            .then((r) => {
            const rr = {};
            Object.keys(r).forEach(i => rr[r[i].get('_k')] = r[i].get(this.lang));
            return this._checkResult(rr, tag)
                .then(result => {
                Object.assign(this.all, result);
                this.loaded[tag] = result;
            });
        })
            .then(() => this.all);
    }
    _checkResult(result, tag) {
        return new Promise((ok, ko) => {
            if (!this.translateAvailable())
                return ok(result);
            const toTranslate = [];
            Object.keys(result).forEach(i => {
                if (!result[i])
                    toTranslate.push(i);
            });
            if (!toTranslate.length)
                return ok(result);
            // Translate
            const req = this.req;
            const fields = { _id: false, _k: true };
            fields[req.ml.configLang] = true;
            req.site.db.lang.find({ _k: { $in: toTranslate } }, fields)
                .then((r) => {
                // Textos fuente en el idioma principal
                const texts = r.map(rt => rt.get(req.ml.configLang));
                this.translate(texts, (err, data) => {
                    if (err)
                        return ko(err);
                    if (data) {
                        data.forEach((v, i) => {
                            const key = r[i]._k;
                            const update = {};
                            update[req.ml.lang] = v;
                            result[key] = v;
                            req.db.collection('lang').updateOne({ _k: key }, { $set: update })
                                .catch(console.error.bind(console));
                        });
                    }
                    ok(result);
                }, tag);
            })
                .catch(ko);
        });
    }
    timeZoneList() {
        return this.load('ecms-timezone').then(r => {
            return {
                "-12": r._TZ_GMTM12,
                "-11": r._TZ_GMTM11,
                "-10": r._TZ_GMTM10,
                "-9": r._TZ_GMTM9,
                "-8": r._TZ_GMTM8,
                "-7": r._TZ_GMTM7,
                "-6": r._TZ_GMTM6,
                "-5": r._TZ_GMTM5,
                "-4": r._TZ_GMTM4,
                "-3.5": r._TZ_GMTM35,
                "-3": r._TZ_GMTM3,
                "-2": r._TZ_GMTM2,
                "-1": r._TZ_GMTM1,
                "0": r._TZ_GMT0,
                "1": r._TZ_GMTP1,
                "2": r._TZ_GMTP2,
                "3": r._TZ_GMTP3,
                "3.5": r._TZ_GMTP35,
                "4": r._TZ_GMTP4,
                "4.5": r._TZ_GMTP45,
                "5": r._TZ_GMTP5,
                "5.5": r._TZ_GMTP55,
                "6": r._TZ_GMTP6,
                "7": r._TZ_GMTP7,
                "8": r._TZ_GMTP8,
                "9": r._TZ_GMTP9,
                "9.5": r._TZ_GMTP95,
                "10": r._TZ_GMTP10,
                "11": r._TZ_GMTP11,
                "12": r._TZ_GMTP12
            };
        });
    }
    get(k) {
        return this.all[k] || k;
    }
    langUserNames() {
        return this.availableLangNames()
            .then(names => {
            const ret = {};
            Object.keys(this.langs).forEach(code => ret[code] = names[code]);
            return ret;
        });
    }
    allLangNames() {
        if (this._allLangNames)
            return Promise.resolve(this._allLangNames);
        return this.req.site.db.lang
            .getValues(this.lang)
            .then((r) => {
            this._allLangNames = {};
            const s = Object.keys(r).sort((a, b) => r[a].localeCompare(r[b], 'es', { sensitivity: "base" }));
            s.forEach(code => this._allLangNames[code] = r[code]);
            return this._allLangNames;
        });
    }
    availableLangNames() {
        if (this._availableLangNames)
            return Promise.resolve(this._availableLangNames);
        const site = this.req.site;
        const names = [];
        return this.allLangNames().then(allLangNames => {
            Object.keys(site.availableTanslatorLangs)
                .forEach(code => allLangNames[code] && names.push([code, allLangNames[code]]));
            names.sort((a, b) => a[1].localeCompare(b[1]));
            this._availableLangNames = {};
            names.forEach(n => this._availableLangNames[n[0]] = n[1]);
            return this._availableLangNames;
        });
    }
    translate(src, cb, srcLog) {
        this.req.site.translate(src, this.configLang, this.lang, cb, srcLog);
    }
}
exports.Multilang = Multilang;
Multilang.defaultLang = 'es';
Multilang.defaultLocale = 'es_ES';
Multilang.availableLangs = {
    ca: 'Català',
    cs: 'Český',
    de: 'Deutsch',
    en: 'English',
    es: 'Español',
    fr: 'Français',
    it: 'Italiano',
    hu: 'Magyar',
    nl: 'Nederlands',
    no: 'Norsk (Bokmål)',
    pl: 'Polski',
    pt: 'Português',
    ro: 'Română',
    sk: 'Slovenský',
    sl: 'Slovenščina',
    sv: 'Svenska',
    tr: 'Türkçe',
    el: 'Ελληνικά',
    ru: 'Русский',
    bg: 'Български',
    ar: 'Arabic',
    zh: '中文',
    ja: '日本語',
    ko: '한국어'
};
function MultilangModule(app) {
    return __awaiter(this, void 0, void 0, function* () {
        const site = app.site;
        yield site.db.lang.check();
        site.langUrls = {};
        return Multilang.availableLanguages(site)
            .then((availableLangs) => {
            Object.keys(availableLangs).forEach(code => {
                site.availableTanslatorLangs[code] = availableLangs[code];
            });
            if (site.environment.translator && site.environment.translator.exclude)
                site.environment.translator.exclude.forEach((code) => delete site.availableTanslatorLangs[code]);
            if (!site.availableTanslatorLangs[site.config.language])
                site.config.set('language', Multilang.defaultLang);
            if (site.config.languages.indexOf(site.config.language) === -1)
                site.config.languages.push(site.config.language);
            site.config.languages.forEach((code) => {
                site.langs[code] = site.availableTanslatorLangs[code];
            });
            if (!site.config.index_all_lang_subdomains)
                site.availableLangs = site.langs;
            else {
                Object.keys(site.availableTanslatorLangs).forEach(code => {
                    site.availableLangs[code] = site.availableTanslatorLangs[code];
                });
            }
            if (site.environment.urls) {
                site.langUrls = site.environment.urls;
            }
            else if (site.config.lang_subdomains) {
                Object.keys(site.availableLangs).forEach(code => site.langUrls[code] = '//' + code + '.' + site.domainName);
                let mainSubdomain = site.config.lang_main_subdomain || (site.config.force_www && 'www') || '';
                if (mainSubdomain)
                    mainSubdomain += '.';
                site.langUrls[site.config.language] = '//' + mainSubdomain + site.domainName;
            }
            else {
                Object.keys(site.availableLangs).forEach(code => {
                    site.langUrls[code] = '//' + site.domainName + '/' + code;
                });
            }
            app.use((req, res, next) => {
                if (/^\/(bdf|videos|resimg|optimg|c)\//.test(req.path))
                    return next();
                req.ml = new Multilang(req);
                req.ml.load('ecms-global')
                    .then(() => next())
                    .catch(next);
            });
        });
    });
}
exports.MultilangModule = MultilangModule;
