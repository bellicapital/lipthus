import * as Debug from 'debug';
require('./modules/vanilla.extensions');

const debug = Debug('site:lipthus');
debug('Loading modules. Please wait...');

import express = require( "express" );
const server = require('./lib/server');
const build = require('./modules/ng2').build;

// module.paths.push('/usr/local/lib/node_modules');


if (!process.env.TMPDIR)
	process.env.TMPDIR = '/tmp';

export const Site = require('./modules/site');
export const listen = require('./modules/listen');

if (!process.env.NODE_ENV)
	process.env.NODE_ENV = 'development';

if (!process.env.TMPDIR)
	process.env.TMPDIR = process.env.TMPDIR || '/tmp/';

if ((process.env.TMPDIR as string).substr(-1) !== '/')
	process.env.TMPDIR += '/';

process.on('warning', (warning) => {
	console.warn(warning.name);
	console.warn(warning.message);
	console.warn(warning.stack);
});

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

require('./modules/functions');

export const lipthusSite = (dir: string, options: any) => {
	return server.check()
		.then(() => new Site(dir).init(options))
		.catch(console.error.bind(console));
};

module.exports = exports;
exports.lipthusSite = lipthusSite;
exports.Site = Site;
exports.dir = __dirname;
exports.listen = listen;
exports.express = express;
exports.build = build;
exports.AjaxGlobalMethods = require('./modules/ajax-global-methods');
