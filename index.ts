import * as Debug from 'debug';
import {Site} from "./modules";
require('./lib/vanilla.extensions');
require('./modules/functions');

const debug = Debug('site:lipthus');
debug('Loading modules. Please wait...');

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

process.on('unhandledRejection', (reason, p) => console.log('Unhandled Rejection at: Promise', p, 'reason:', reason));

export function lipthusSite(dir: string, options: any): Promise<Site> {
	return new Promise((ok, ko) => {
		const site = new Site(dir, options);
		
		site.on('ready', () => ok(site));
		site.on('error', ko);
	});
}

export * from './modules';
export * from './lib';
export {Types} from 'mongoose';
export {Request, Response, Application} from './interfaces/global.interface';
export {Router, NextFunction} from 'express';
