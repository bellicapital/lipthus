import * as express from "express";
import {ErrorRequestHandler, IRouterHandler, IRouterMatcher} from "express-serve-static-core";
import {Site, Db} from "../modules";

export interface RequestHandler {
	// tslint:disable-next-line callable-types (This is extended from and can't extend from a type alias in ts<2.2
	// (req: Request, res: Response, next: express.NextFunction): any;
}
export type RequestHandlerParams = RequestHandler | ErrorRequestHandler | Array<RequestHandler | ErrorRequestHandler>;
export type ApplicationRequestHandler<T> = IRouterHandler<T> & IRouterMatcher<T> & ((...handlers: RequestHandlerParams[]) => T);

declare global {
	
	function l(): void;
	
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

export interface Hooks {
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

export interface ObjectArray {
	key: string;
	value: any;
}

