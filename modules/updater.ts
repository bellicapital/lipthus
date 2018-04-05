import * as Debug from 'debug';
import {Site} from "./site";
import {updates} from '../updates';
import {existsSync} from 'fs';

const debug = Debug('site:updater');
debug.log = console.log.bind(console);


export function checkVersions(site: Site): Promise<any> {
	return Promise.all([
		checkCmsVersion(site),
		checkAppVersion(site)
	]);
}

function checkCmsVersion(site: Site) {
	debug('lipthus version:' + site.config.version);
	
	if (site.cmsPackage.version === site.config.version)
		return;
	
	return checkRequireScript(
		updates,
		'version',
		site.cmsPackage.version,
		site
	);
}

function checkAppVersion(site: Site) {
	debug('site version:' + site.config.siteversion);
	
	if (site.package.version === site.config.siteversion)
		return;
	
	const file = site.dir + '/updates.ts';
	
	if (!existsSync(file))
		return;
	
	return checkRequireScript(
		require(file),
		'siteversion',
		site.package.version,
		site
	);
}

function checkRequireScript(func: any, varname: string, value: string, site: Site) {
	console.log('upgrading ' + varname + ' to ' + value);
	
	return func(site, value)
		.then((r: { ok: boolean }): void => {
			/**
			 * Iguala la versión en la bd
			 */
			if (process.env.NODE_ENV === 'production' || (r && r.ok === true))
				return site.config.set(varname, value, true)
					.then(() => console.log(varname + ' updated!'));
			
			console.warn(varname + ' not updated!. Updater script should resolve to "{ok: true}" in a non production enviroment');
		});
}
