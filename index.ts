import * as Debug from 'debug';
import * as utils from './modules/utils';
require('./modules/vanilla.extensions');

const debug = Debug('site:lipthus');
debug('Loading modules. Please wait...');

import express = require( "express" );
import {Site} from "./modules/site";
import * as Bdi from './modules/bdi';

const server = require('./lib/server');
const build = require('./modules/ng2').build;

if (!process.env.TMPDIR)
	process.env.TMPDIR = '/tmp';

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

export function lipthusSite(dir: string, options: any) {
	return server.check()
		.then(() => new Site(dir).init(options))
		.catch(console.error.bind(console));
}

export const urlContent = utils.urlContent;
export const BinDataImage = Bdi;
module.exports = exports;
exports.Site = Site;
exports.dir = __dirname;
exports.listen = listen;
exports.express = express;
exports.build = build;
exports.AjaxGlobalMethods = require('./modules/ajax-global-methods');
