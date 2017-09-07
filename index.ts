"use strict";

const server = require('./lib/server');
const env = process.env as any;

env.TMPDIR = env.TMPDIR || '/tmp';

const Site = require('./modules/site');

if(!env.NODE_ENV)
	env.NODE_ENV = 'development';

if(env.TMPDIR.substr(-1) !== '/')
	env.TMPDIR += '/';

process.on('warning', (warning) => {
	console.warn(warning.name);
	console.warn(warning.message);
	console.warn(warning.stack);
});

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

require ('./modules/functions');

// noinspection JSUnusedGlobalSymbols
export function lipthusSite(dir:string, options?: any){
	return server.check()
		.then(() => new Site(dir).init(options));
}

exports.Site = Site;
exports.dir = __dirname;
export const dir = __dirname;