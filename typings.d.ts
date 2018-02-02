import * as express from "express";
import {NextFunction} from "express";
import {ErrorRequestHandler, IRouterHandler, IRouterMatcher} from "express-serve-static-core";
import {Site} from "./modules";
import {Db} from "./modules";
import {Binary} from "bson";
import {ObjectArray} from "./";

declare function l(): void;

interface RequestHandler {
	// tslint:disable-next-line callable-types (This is extended from and can't extend from a type alias in ts<2.2
	(req: Request, res: Response, next: NextFunction): any;
}
type RequestHandlerParams = RequestHandler | ErrorRequestHandler | Array<RequestHandler | ErrorRequestHandler>;
type ApplicationRequestHandler<T> = IRouterHandler<T> & IRouterMatcher<T> & ((...handlers: RequestHandlerParams[]) => T);

declare global {
	
	interface Date {
		// noinspection JSUnusedLocalSymbols
		toUserDatetimeString(intl: string, sep: string): string;
		toFormDateString(): string;
		// noinspection JSUnusedLocalSymbols
		addDays(days: number): any;
		// noinspection JSUnusedLocalSymbols
		toUserDateString(intl: string, sep: string): string;
		toUserTimeString(): string;
		toFormDateTimeString(): string;
		toSpanishDatepickerString(): string;
		hm(): string;
		// noinspection JSUnusedLocalSymbols
		hmFull(intl: string, sep: string): string;
	}
	
	interface Number {
		size(): string;
	}
	
	interface Object {
		// noinspection JSUnusedLocalSymbols
		some(o: any, fn: (a: string, b: any) => any): void;
		// noinspection JSUnusedLocalSymbols
		each(o: any, fn: (a: string, b: any) => any): void;
		// noinspection JSUnusedLocalSymbols
		map(o: any, fn: (a: string, b: any) => any): any;
		// noinspection JSUnusedLocalSymbols
		extend(a: any, b: any): any;
		// noinspection JSUnusedLocalSymbols
		toArray(o: any): Array<any>;
		// noinspection JSUnusedLocalSymbols
		ksort(o: any): any;
		// noinspection JSUnusedLocalSymbols
		sort(o: any, fn: (a: ObjectArray, b: ObjectArray) => any): any;
		// noinspection JSUnusedLocalSymbols
		values(o: any): Array<any>;
	}
	
	interface String {
		ucfirst(): string;
		// noinspection JSUnusedLocalSymbols
		striptags(allowedTags?: string): string;
		// noinspection JSUnusedLocalSymbols
		truncate(length: number, options?: any): string;
	}
}

// noinspection JSUnusedLocalSymbols
export declare function lipthusSite(dir: string, options: any): Promise<Site>;
// noinspection JSUnusedLocalSymbols
export declare function urlContent(url: string): Promise<string>;

declare interface Hooks {
	pre: any;
	post: any;
}

export interface Request extends express.Request {
	cmsDir: string;
	domainName: string;
	staticHost: string;
	// hostname: string;
	fullUri: string;
	notifyError: (err: any) => void;
	ml: any;
	device: any;
	logger: any;
	db: Db;
	site: Site;
	user?: any;
}

export interface Response extends express.Response {
	now: number;
}

export interface Application extends express.Application {
	use: ApplicationRequestHandler<this>;
}

export class BinDataImage {
	weight?: number;
	contentType: string;
	size: number;
	md5: string;
	uploadDate: Date;
	mtime: Date;
	name: string;
	MongoBinData: Binary;
	width: number;
	height: number;
	
	// noinspection JSUnusedLocalSymbols
	static fromUrl(str: string): Promise<BinDataImage>;
}

export interface ObjectArray {
	key: string;
	value: any;
}

export {Types} from 'mongoose';
