import * as Debug from 'debug';
import {Site} from "./site";

const debug = Debug('site:updater');
debug.log = console.log.bind(console);


export function checkVersions (site: Site): Promise<any> {
	return Promise.all([
		checkCmsVersion(site),
		checkAppVersion(site)
	]);
}

function checkCmsVersion (site: Site) {
	debug('lipthus:' + site.config.version);
	
	if (site.cmsPackage.version === site.config.version)
		return Promise.resolve();
	
	return checkRequireScript(
		'../updates/' + site.cmsPackage.version,
		'version',
		site.cmsPackage.version,
		site
	);
}

function checkAppVersion (site: Site) {
	debug(site.config.siteversion);
	
	if (site.package.version === site.config.siteversion)
		return Promise.resolve();
	
	return checkRequireScript(
		site.dir + '/updates/' + site.package.version,
		'siteversion',
		site.package.version,
		site
	);
}

function checkRequireScript (src: string, varname: string, value: string, site: Site) {
	console.log('upgrading ' + varname + ' to ' + value);
	
	/**
	 * Iguala la versión en la bd
	 */
	const fix = (r: {ok: boolean}): void => {
		if (process.env.NODE_ENV === 'production' || (r && r.ok === true))
			return site.config.set(varname, value, true)
				.then(() => console.log(varname + ' updated!'));
		
		console.warn(varname + ' not updated!. Updater script should resolve to "{ok: true}" in a non production enviroment');
	};
	
	try {
		const updater = require(src);
		
		const ret = updater(site);
		
		if (!(ret instanceof Promise))
			return Promise.reject(new Error('Update script "' + src + '" should return Promise'));
		
		return ret.then(fix);
	} catch (err) {
		if (err.code === 'MODULE_NOT_FOUND' && err.message.indexOf(value) > 0)
		// no hay actualizador
			return fix({ok: true});
		else
			return Promise.reject(err);
	}
}
