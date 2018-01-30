import * as Debug from 'debug';
import * as utils from './modules/utils';
require('./modules/vanilla.extensions');

const debug = Debug('site:lipthus');
debug('Loading modules. Please wait...');

import {Site} from "./modules/site";
import * as Bdi from './modules/bdi';

const server = require('./lib/server');

if (!process.env.TMPDIR)
	process.env.TMPDIR = '/tmp';

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
		.then(() => new Site(dir).init(options));
}

export const urlContent = utils.urlContent;
export const BinDataImage = Bdi;
export {Site};
// export default lipthusSite;
