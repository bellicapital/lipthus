"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const util_1 = require("util");
const Debug = require("debug");
const debug = Debug('site:site');
const pReadFile = util_1.promisify(fs.readFile);
const pReadDir = util_1.promisify(fs.readdir);
const exec = require('child_process').exec;
class Ng2helper {
    constructor(app, dir, route, userLevel = 0, routes = ['/']) {
        this.app = app;
        this.dir = dir;
        this.route = route;
        this.userLevel = userLevel;
        this.routes = routes;
        this.indexFile = '';
        this.ffound = [];
        this.notffound = [];
    }
    serveIfBuild() {
        return pExists(this.dir)
            .then(exists => {
            if (exists)
                return this.doServe();
        });
    }
    doServe() {
        return pReadFile(this.dir + '/index.html', 'utf8')
            .then(raw => 
        // modify base url & store index.html in indexCache
        this.indexFile = raw.replace(/base href="\/"/, 'base href="' + this.route + '/"'))
            .then(() => this.app.use(this.route, this.middelware.bind(this)));
    }
    middelware(req, res, next) {
        this.checkUserLevel(req)
            .then(ok => {
            if (!ok) {
                let url = '/login/?referrer=' + encodeURIComponent(this.route);
                if (req.user)
                    url += '&msg=No tienes acceso a esta sección';
                return res.redirect(url);
            }
            if (req.path === '/' || this.routes.indexOf(req.path) !== -1 || this.notffound.indexOf(req.path) !== -1)
                return res.send(this.indexFile);
            const file = this.dir + req.path;
            if (this.ffound.indexOf(req.path) !== -1)
                return res.sendFile(file);
            return pExists(file)
                .then(exists => {
                if (exists) {
                    this.ffound.push(req.path);
                    return res.sendFile(file);
                }
                else {
                    this.notffound.push(req.path);
                    return res.send(this.indexFile);
                }
            });
        })
            .catch(next);
    }
    checkUserLevel(req) {
        if (!this.userLevel)
            return Promise.resolve(true);
        return req.getUser()
            .then(user => user && user.level >= this.userLevel);
    }
    static serve(app, dir, route, userLevel, routes) {
        return new Ng2helper(app, dir, route, userLevel, routes).serveIfBuild();
    }
}
const methods = {
    serve(app) {
        const dir = app.get('dir');
        const lipthusRoutes = app.get('lipthusDir') + '/ng-routes';
        const customRoutes = dir + '/ng-routes';
        const serve = Ng2helper.serve;
        const conf = app.site.package.config.ngRoutes || {};
        return pExists(dir + '/angular-cli.json')
            .then(exists => exists && serve(app, dir, '/home'))
            .then(() => pReadDir(lipthusRoutes))
            .then(r => Promise.all(r.map((d) => serve(app, lipthusRoutes + '/' + d, '/' + d, conf[d] && conf[d].userlevel))))
            .then(() => pExists(customRoutes))
            .then(exists => {
            if (!exists)
                return;
            return pReadDir(customRoutes)
                .then((r) => Promise.all(r.map((d) => serve(app, customRoutes + '/' + d, '/' + d, conf[d] && conf[d].userlevel))));
        });
    },
    build(dir) {
        return pExists(dir + '/.angular-cli.json')
            .then(exists => {
            if (!exists)
                return;
            const dist = dir + '/dist';
            return pExists(dist)
                .then(exists2 => {
                if (exists2)
                    return;
                debug('Angular 2. Building ' + dir);
                return new Promise((ok, ko) => exec('cd ' + dir + ' && ng build --prod', { maxBuffer: 1024 * 900 }, (err) => err ? ko(err) : ok()))
                    .then(() => pExists(dist))
                    .then(exists3 => {
                    if (!exists3)
                        throw new Error('Could not build ' + dist);
                });
            });
        });
    }
};
const pExists = (file) => {
    return Promise.resolve(fs.existsSync(file));
};
exports.default = (app) => {
    return methods.build(app.get('dir'))
        .then(() => methods.serve(app));
};
