"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Debug = require("debug");
const updates_1 = require("../updates");
const fs_1 = require("fs");
const compareVersions = require("compare-versions");
const debug = Debug('site:version');
function checkVersions(site) {
    return Promise.all([
        checkCmsVersion(site),
        checkAppVersion(site)
    ]);
}
exports.checkVersions = checkVersions;
function checkCmsVersion(site) {
    debug('lipthus: v' + site.config.version);
    if (site.cmsPackage.version === site.config.version)
        return;
    return checkRequireScript(updates_1.default, 'version', site.config.version, site.cmsPackage.version, site);
}
function checkAppVersion(site) {
    debug(site.key + ' : v' + site.config.siteversion);
    if (site.package.version === site.config.siteversion)
        return;
    if (!fs_1.existsSync(site.srcDir + '/updates.ts'))
        return;
    const versionUpdates = require(site.dir + '/updates').default;
    // Old way updates are deprecated
    if (!versionUpdates.length)
        return;
    return checkRequireScript(versionUpdates, 'siteversion', site.config.siteversion, site.package.version, site);
}
async function checkRequireScript(versionUpdates, varName, from, to, site) {
    console.log('upgrading ' + varName + ' to ' + to);
    const toUpdate = versionUpdates
        .filter(update => compareVersions(update.version, from) === 1)
        .sort((a, b) => compareVersions(a.version, b.version));
    for (const update of toUpdate) {
        await update.updater(site);
        // Store the current update version
        await site.config.set(varName, update.version, true);
        console.log(varName + ' update patch ' + update.version + ' applied');
    }
    const value = await site.config.get(varName);
    if (value !== to)
        return site.config.set(varName, to, null, true);
}
