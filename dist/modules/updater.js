"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
const updates_1 = require("../updates");
const fs_1 = require("fs");
const debug = Debug('site:updater');
debug.log = console.log.bind(console);
function checkVersions(site) {
    return Promise.all([
        checkCmsVersion(site),
        checkAppVersion(site)
    ]);
}
exports.checkVersions = checkVersions;
function checkCmsVersion(site) {
    debug('lipthus version:' + site.config.version);
    if (site.cmsPackage.version === site.config.version)
        return;
    return checkRequireScript(updates_1.updates, 'version', site.cmsPackage.version, site);
}
function checkAppVersion(site) {
    debug('site version:' + site.config.siteversion);
    if (site.package.version === site.config.siteversion)
        return;
    const file = site.dir + '/updates.ts';
    if (!fs_1.existsSync(file))
        return;
    return checkRequireScript(require(file), 'siteversion', site.package.version, site);
}
function checkRequireScript(func, varname, value, site) {
    console.log('upgrading ' + varname + ' to ' + value);
    return func(site, value)
        .then((r) => {
        /**
         * Iguala la versión en la bd
         */
        if (process.env.NODE_ENV === 'production' || (r && r.ok === true))
            return site.config.set(varname, value, true)
                .then(() => console.log(varname + ' updated!'));
        console.warn(varname + ' not updated!. Updater script should resolve to "{ok: true}" in a non production enviroment');
    });
}
