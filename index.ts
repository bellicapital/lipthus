import * as Debug from 'debug';
import './lib/vanilla.extensions';
import './lib/global.l';
import {LipthusDb, Site} from "./modules";
import {User} from "./schemas/user";
import * as express from "express";
import {ApplicationRequestHandler, CssResponse, KeyString} from "./interfaces/global.interface";
import {LipthusError} from "./classes/lipthus-error";
import {LipthusLogger} from "./modules/logger";
import {Multilang} from "./modules/multilang";
import {HtmlPage} from "./modules/htmlpage";

const debug = Debug('site:lipthus');
debug('Loading modules. Please wait...');

if (!process.env.NODE_ENV)
	process.env.NODE_ENV = 'development';

if (!process.env.TMPDIR)
	process.env.TMPDIR = process.env.TMPDIR || '/tmp/';

if ((process.env.TMPDIR as string).substr(-1) !== '/')
	process.env.TMPDIR += '/';

process.on('warning', (warning: any) => {
	console.warn(warning.name);
	console.warn(warning.message);
	console.warn(warning.stack);
});

process.on('unhandledRejection', (reason: any, p: any) => console.log('Unhandled Rejection at: Promise', p, 'reason:', reason));

// noinspection JSUnusedGlobalSymbols
export function lipthusSite(dir: string, options?: any): Promise<Site> {
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
export interface LipthusRequest extends express.Request {
	res: LipthusResponse;
	domainName: string;
	staticHost: string;
	// hostname: string;
	fullUri: string;
	notifyError: (err: any) => void;
	ml: Multilang;
	device: any;
	logger: LipthusLogger;
	logIn: (user: any, cb: any) => void;
	logout: () => void;
	userLoginMsg?: string;
	db: LipthusDb;
	site: Site;
	app: LipthusApplication;
	session: any;
	user?: User;
	maxImgWidth?: number;
	maxImgHeight?: number;
	imgCrop?: boolean;
	imgEnlarge?: boolean;
	imgnwm?: boolean;
	ipLocation: any;
	nationalities: KeyString;
	getUser: () => Promise<User>;
	files: Array<any>;	// Array<UploadedFile>;
	security: any;
	logError: (err: LipthusError) => Promise<any>;
	lessSourceMap: string;
	cssResponse: CssResponse;
	/**
	 * @deprecated
	 */
	cmsDir: string;
}

export interface LipthusResponse extends express.Response {
	now: number;
	htmlPage: HtmlPage;
	timer: any;
}

export interface LipthusApplication extends express.Application {
	use: ApplicationRequestHandler<this>;
	db: LipthusDb;
	site: Site;

	getModule: (name: string) => any;
	nodeModule: (name: string) => any;
}

export {LipthusError} from './classes/lipthus-error';
export {LipthusDocument} from './interfaces/lipthus-document';
export const nodeModule = (key: string) => require(key);
export {Setting, SettingModel} from "./schemas/settings";
export {LipthusCache, LipthusCacheModel} from "./schemas/cache";
export {Tmp, TmpModel} from "./schemas/tmp";
export {Search, SearchModel} from "./schemas/search";
export {User, UserModel} from "./schemas/user";
export {NationalitiesModel, Nationality} from './schemas/nationalities';
export {EnvironmentParams, DbParams} from './interfaces/global.interface';
export {LipthusComment, LipthusCommentModel} from "./schemas/comment";
