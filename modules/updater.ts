import * as Debug from 'debug';
import {Site} from "./site";
import cmsUpdates from '../updates';
import {existsSync} from 'fs';
import * as compareVersions from 'compare-versions';

const debug = Debug('site:version');

export function checkVersions(site: Site): Promise<any> {
	return Promise.all([
		checkCmsVersion(site),
		checkAppVersion(site)
	]);
}

function checkCmsVersion(site: Site) {
	debug('lipthus: v' + site.config.version);

	if (site.cmsPackage.version === site.config.version)
		return;

	return checkRequireScript(
		cmsUpdates,
		'version',
		site.config.version,
		site.cmsPackage.version,
		site
	);
}

function checkAppVersion(site: Site) {
	debug(site.key + ' : v' + site.config.siteversion);

	if (site.package.version === site.config.siteversion)
		return;

	if (!existsSync(site.srcDir + '/updates.ts'))
		return;

	const versionUpdates = require(site.dir + '/updates').default;

	// Old way updates are deprecated
	if (!versionUpdates.length)
		return;

	return checkRequireScript(
		versionUpdates,
		'siteversion',
		site.config.siteversion,
		site.package.version,
		site
	);
}

async function checkRequireScript(versionUpdates: Array<VersionUpdate>, varName: string, from: string, to: string, site: Site) {
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

interface VersionUpdate {
	version: string;
	updater: (site: Site) => Promise<void>;
}
