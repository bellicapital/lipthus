import * as Debug from 'debug';
import './lib/vanilla.extensions';
import './modules/functions';
import {LipthusDb as Db_, Site} from "./modules";
import {User, UserModel} from "./schemas/user";
import * as express from "express";
import {ApplicationRequestHandler} from "./interfaces/global.interface";
import {TmpModel} from "./schemas/tmp";
import {SearchModel} from "./schemas/search";
import {UploadedFile} from "./interfaces/uploaded-file";

const debug = Debug('site:lipthus');
debug('Loading modules. Please wait...');

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
export {Router, NextFunction} from 'express';
export class LipthusDb extends Db_ {
	search?: SearchModel;
	tmp?: TmpModel;
	user?: UserModel;
}
export {User};
export interface LipthusRequest extends express.Request {
	domainName: string;
	staticHost: string;
	// hostname: string;
	fullUri: string;
	notifyError: (err: any) => void;
	ml: any;
	device: any;
	logger: any;
	db: LipthusDb;
	site: Site;
	app: LipthusApplication;
	session: any;
	user?: User;
	maxImgWidth?: number;
	maxImgHeight?: number;
	imgCrop?: boolean;
	imgnwm?: boolean;
	ipLocation: any;
	getUser: () => Promise<User>;
	files?: Array<UploadedFile>;
	/**
	 * @deprecated
	 */
	cmsDir: string;
}

export interface LipthusResponse extends express.Response {
	now: number;
	htmlPage: any;
}

export interface LipthusApplication extends express.Application {
	use: ApplicationRequestHandler<this>;
	db: LipthusDb;
	
	/**
	 * @deprecated
	 */
	getModule: (name: string) => any;
	/**
	 * @deprecated
	 */
	eucaModule: (name: string) => any;
	/**
	 * @deprecated
	 */
	nodeModule: (name: string) => any;
}
