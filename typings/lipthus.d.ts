import * as express from "express";
import {Site} from "../modules";
import Db = require("./lipthus-db");
import {IRouterHandler, IRouterMatcher} from "express-serve-static-core";


export interface RequestHandler extends express.RequestHandler {
	// tslint:disable-next-line callable-types (This is extended from and can't extend from a type alias in ts<2.2
	// noinspection JSUnusedLocalSymbols
	(req: LipthusRequest, res: LipthusResponse, next: express.NextFunction): any;
}
export interface ErrorRequestHandler extends express.ErrorRequestHandler {
	// tslint:disable-next-line callable-types (This is extended from and can't extend from a type alias in ts<2.2
	// noinspection JSUnusedLocalSymbols
	(err: any, req: LipthusRequest, res: LipthusResponse, next: express.NextFunction): any;
}
export type RequestHandlerParams = RequestHandler | ErrorRequestHandler | Array<RequestHandler> | Array<ErrorRequestHandler>;
export type ApplicationRequestHandler<T> = IRouterHandler<T> & IRouterMatcher<T> & ((...handlers: RequestHandlerParams[]) => T);

export interface LipthusRequest extends express.Request {
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
	app: LipthusApplication;
	session: any;
	user?: any;
	maxImgWidth?: number;
	maxImgHeight?: number;
	imgCrop?: boolean;
	imgnwm?: boolean;
	ipLocation: any;
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
	db: Db;
	
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
