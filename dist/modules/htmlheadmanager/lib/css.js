"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const extensions = ['less', 'css'];
class CssManager {
    constructor(req, res) {
        this.req = req;
        this.scripts = {};
        this.inited = false;
        this.publicDir = req.site.srcDir + '/public';
        this.dir = this.publicDir + '/css/';
        this.lipthusDir = req.site.lipthusDir + '/public/css/';
        this.staticHost = res.locals.staticHost;
        this.deviceType = req.device.type;
        this.routes = [
            { path: this.dir + this.deviceType, url: '/d/' + this.deviceType + '/', isDevice: true },
            { path: this.dir, url: '/d/g/' },
            { path: this.lipthusDir + this.deviceType, url: '/d/' + this.deviceType + '/', isDevice: true, isCMS: true },
            { path: this.lipthusDir, url: '/g/g/', isCMS: true }
        ];
    }
    init() {
        if (this.inited)
            return this;
        this.inited = true;
    }
    add(src, opt) {
        if (typeof opt === 'number')
            opt = { priority: opt };
        else if (!opt)
            opt = {};
        else
            opt = Object.assign({}, opt);
        if (/^(http|\/)/.test(src) && !opt.path) {
            opt.url = src;
        }
        else if (/^\w/.test(src)) {
            const p = this.absolutePath(src);
            if (!p)
                return this;
            opt.path = p.path;
            opt.url = p.url;
            opt.device = p.isDevice && this.deviceType;
            opt.isCMS = !!p.isCMS;
            opt.basename = src;
            opt.ext = p.ext;
            const stat = fs.statSync(p.path);
            opt.mtime = Math.floor(stat.mtime.getTime() / 1000);
            src = p.path;
        }
        this.scripts[src] = new CssFile(opt);
        return this;
    }
    final() {
        const ret = {
            head: [],
            inline: [],
            deferred: []
        };
        const toCombine = {
            head: [],
            inline: [],
            deferred: []
        };
        const scripts = Object.values(this.scripts);
        // sort by priority
        scripts.sort((a, b) => b.priority - a.priority);
        scripts.forEach(script => {
            const target = script.inline ? 'inline' : (script.deferred ? 'deferred' : 'head');
            if (script.path && exists(script.path))
                return toCombine[target].push(script);
            const obj = { src: script.url };
            if (script.inline)
                obj.path = script.path;
            else if (script.mtime)
                obj.m = script.mtime;
            ret[target].push(obj);
        });
        return this.combine(toCombine.head)
            .then(r => r && ret.head.push(r))
            .then(() => this.combine(toCombine.deferred))
            .then(r => r && ret.deferred.push(r))
            .then(() => {
            let inline = '';
            ret.inline.forEach((il) => {
                if (il.data)
                    inline += il.data;
                else
                    inline += fs.readFileSync(il.path);
            });
            ret.inline = inline;
            return ret;
        });
    }
    combine(scripts) {
        if (!scripts.length)
            return Promise.resolve();
        let mtime = 0;
        const keys = [];
        const files = [];
        scripts.forEach(script => {
            keys.push(encodeURIComponent(script.baseKey()));
            files.push(script.path);
            if (mtime < script.mtime)
                mtime = script.mtime;
        });
        const basename = keys.join('+');
        return this.req.db.cacheless
            .getCachedFiles(files, basename)
            .then((r) => ({
            src: this.staticHost + '/css/' + basename + '.' + Math.floor(mtime) + '.css',
            data: r.css
        }));
    }
    absolutePath(fn) {
        let ret = null;
        this.routes.some(route => {
            const ep = CssManager.extPath(route.path, fn);
            if (ep) {
                ret = ep;
                ret.isCMS = route.isCMS;
                ret.isDevice = route.isDevice;
                ret.url = '/css' + route.url + ep.basename + '.css';
                return true;
            }
            else
                return false;
        });
        return ret;
    }
    static extPath(dir, fn) {
        const p = path.parse(fn);
        const fExt = p.ext.substr(1);
        let ret;
        if (fExt && extensions.indexOf(fExt) !== -1) {
            ret = path.join(dir, fn);
            return exists(ret) && { path: ret, basename: p.name, fn: fn, ext: fExt };
        }
        extensions.some(ext => {
            const fn2 = fn + '.' + ext;
            const tmp = path.join(dir, fn2);
            if (exists(tmp)) {
                ret = { path: tmp, basename: fn, fn: fn2, ext: ext };
                return true;
            }
            else
                return false;
        });
        return ret;
    }
}
exports.CssManager = CssManager;
class CssFile {
    constructor(p) {
        this.inline = !!p.deferred;
        this.deferred = !!p.inline;
        this.isCMS = !!p.isCMS;
        this.priority = p.priority || 0;
        this.attributes = p.attributes || [];
        if (p.mtime)
            this.mtime = p.mtime;
        if (p.basename)
            this.basename = p.basename;
        if (p.device)
            this.device = p.device;
        if (p.path)
            this.path = p.path;
        if (p.url)
            this.url = p.url;
    }
    baseKey() {
        return (this.isCMS ? 'g' : 'd')
            + (this.device ? this.device.substr(0, 1) : 'g')
            + '-' + this.basename;
    }
}
function exists(fn) {
    try {
        fs.accessSync(fn);
        return true;
    }
    catch (ex) {
        return false;
    }
}
