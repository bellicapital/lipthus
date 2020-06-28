"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const util_1 = require("util");
const pReadFile = util_1.promisify(fs.readFile);
const pReadDir = util_1.promisify(fs.readdir);
class Ng2helper {
    constructor(app, dir, route, userLevel = 0, routes = ['/']) {
        this.app = app;
        this.dir = dir;
        this.route = route;
        this.userLevel = userLevel;
        this.routes = routes;
        this.indexFile = '';
        this.fFound = [];
        this.notFFound = [];
    }
    static serve(app, dir, route, userLevel, routes) {
        return new Ng2helper(app, dir, route, userLevel, routes).serveIfBuild();
    }
    serveIfBuild() {
        if (fs.existsSync(this.dir))
            return this.doServe();
    }
    async doServe() {
        const raw = await pReadFile(this.dir + '/index.html', 'utf8');
        this.indexFile = raw.replace(/base href="\/"/, 'base href="' + this.route + '/"');
        this.app.use(this.route, this.middleware.bind(this));
    }
    middleware(req, res, next) {
        this.checkUserLevel(req)
            .then(ok => {
            if (!ok) {
                let url = '/login/?referrer=' + encodeURIComponent(this.route);
                if (req.user)
                    url += '&msg=No tienes acceso a esta sección';
                return res.redirect(url);
            }
            if (req.path === '/' || this.routes.indexOf(req.path) !== -1 || this.notFFound.indexOf(req.path) !== -1)
                return res.send(this.indexFile);
            const file = this.dir + req.path;
            if (this.fFound.indexOf(req.path) !== -1)
                return res.sendFile(file);
            return pExists(file)
                .then(exists => {
                if (exists) {
                    this.fFound.push(req.path);
                    return res.sendFile(file);
                }
                else {
                    this.notFFound.push(req.path);
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
}
const methods = {
    async serve(app) {
        const dir = app.get('srcDir');
        const lipthusRoutes = app.get('lipthusDir') + '/ng-routes';
        const serve = Ng2helper.serve;
        const conf = app.site.package.config.ngRoutes || {};
        const customRoutes = dir + '/ng-routes';
        if (fs.existsSync(dir + '/angular-cli.json'))
            await Ng2helper.serve(app, dir, '/home');
        const r = await pReadDir(lipthusRoutes);
        await Promise.all(r.map((d) => serve(app, lipthusRoutes + '/' + d, '/' + d, conf[d] && conf[d].userlevel)));
        if (fs.existsSync(customRoutes)) {
            const r2 = await pReadDir(customRoutes);
            await Promise.all(r2.map((d) => serve(app, customRoutes + '/' + d, '/' + d, conf[d] && conf[d].userlevel)));
        }
    }
};
const pExists = (file) => {
    return Promise.resolve(fs.existsSync(file));
};
exports.default = (app) => {
    return methods.serve(app);
};
