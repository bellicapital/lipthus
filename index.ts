import * as Debug from 'debug';
import './lib/vanilla.extensions';
import {LipthusDb, Site, SiteOptions} from "./modules";
import {User} from "./schemas/user";
import {ApplicationRequestHandler, CssResponse, KeyAny, KeyString} from "./interfaces/global.interface";
import {LipthusError} from "./classes/lipthus-error";
import {LipthusLogger} from "./modules/logger";
import {Multilang} from "./modules/multilang";
import {HtmlPage} from "./modules/htmlpage";
import {LipthusWebSocketServer} from "./classes/web-socket-server";
import {Server as Server} from "https";
import * as express from "express";
import {IpLocation} from "./modules/geo/ip-location";
import {Response} from "express";

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
export function lipthusSite(dir: string, options?: SiteOptions): Promise<Site> {
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
    subdomains: string[];
    cookies: KeyString;
    xhr: boolean;
    query: KeyAny;
    body: any;
    method: string;
    headers: KeyString;
    originalUrl: string;
    protocol: string;
    hostname: any;
    path: any;
    url: string;
	params: KeyString;
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
	ipLocation: IpLocation;
	nationalities: KeyString;
	getUser: () => Promise<User | void>;
	files: Array<any>;	// Array<UploadedFile>;
	security: any;
	logError: (err: LipthusError) => Promise<void | Error>;
	lessSourceMap: string;
	cssResponse: CssResponse;
	sessionID: string;
	ip: string;
	ips: string[];
	/**
	 * @deprecated
	 */
	cmsDir: string;
	csrfToken(): string;
	get(arg0: string): any;
	next(next: any);
}

export interface LipthusResponse extends Response {
	now: number;
	htmlPage: HtmlPage;
	timer: any;
}

export interface LipthusApplication extends express.Application {
	use: any | ApplicationRequestHandler<this>;
	db: LipthusDb;
	site: Site;
	wss: LipthusWebSocketServer;
	server: Server;
	subscriber: any;

	getModule: (name: string) => any;
	nodeModule: (name: string) => any;
}

export {CachedFile} from './classes/cached-file';
export {LipthusError} from './classes/lipthus-error';
export {LipthusWebSocketServer} from './classes/web-socket-server';
export {LipthusDocument} from './interfaces/lipthus-document';
// noinspection JSUnusedGlobalSymbols
export const nodeModule = (key: string) => require(key);
export {Setting, SettingModel} from "./schemas/settings";
export {LipthusCache, LipthusCacheModel} from "./schemas/cache";
export {Tmp, TmpModel} from "./schemas/tmp";
export {Search, SearchModel} from "./schemas/search";
export {User, UserModel} from "./schemas/user";
export {NationalitiesModel, Nationality} from './schemas/nationalities';
export {EnvironmentParams, DbParams} from './interfaces/global.interface';
export {LipthusComment, LipthusCommentModel} from "./schemas/comment";
