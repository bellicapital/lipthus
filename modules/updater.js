"use strict";

const debug = require('debug')('site:updater');
debug.log = console.log.bind(console);

/**
 * @param {Site} site
 * @returns {undefined}
 */
const methods = {
	checkVersions: site => {
		return Promise.all([
			methods.checkCmsVersion(site),
			methods.checkAppVersion(site)
		]);
	},
	checkCmsVersion: site => {
		debug('lipthus:' + site.config.version);

		if(site.cmsPackage.version === site.config.version)
			return Promise.resolve();

		return methods.checkRequireScript(
			'../updates/' + site.cmsPackage.version,
			'version',
			site.cmsPackage.version,
			site
		);
	},
	checkAppVersion: site => {
		debug(site.config.siteversion);
		
		if(site.package.version === site.config.siteversion)
			return Promise.resolve();

		return methods.checkRequireScript(
			site.dir + '/updates/' + site.package.version,
			'siteversion',
			site.package.version,
			site
		);
	},
	checkRequireScript: (src, varname, value, site) => {
		console.info('upgrading ' + varname + ' to ' + value);

		/**
		 * Iguala la versión en la bd
		 * @returns {undefined}
		 */
		const fix = r => {
			if(process.env.NODE_ENV === 'production' || (r && r.ok === true))
				return site.config.set(varname, value, true)
					.then(() => console.info(varname + ' updated!'));

			console.warn(varname + ' not updated!. Updater script should resolve to "{ok: true}" in a non production enviroment');
		};

		try {
			const updater = require(src);

			const ret = updater(site);

			if(!(ret instanceof Promise))
				return Promise.reject(new Error('Update script "' + src + '" should return Promise'));

			return ret.then(fix);
		} catch(err){
			if(err.code === 'MODULE_NOT_FOUND' && err.message.indexOf(value) > 0)
				// no hay actualizador
				return fix({ok: true});
			else
				return Promise.reject(err);
		}
	}
};

module.exports = methods;
