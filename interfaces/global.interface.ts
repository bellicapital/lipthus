import * as express from "express";
import {ErrorRequestHandler, IRouterHandler, IRouterMatcher} from "express-serve-static-core";
import Db = require("../typings/lipthus-db");

export interface RequestHandler {
	// tslint:disable-next-line callable-types (This is extended from and can't extend from a type alias in ts<2.2
	// (req: Request, res: Response, next: express.NextFunction): any;
}
export type RequestHandlerParams = RequestHandler | ErrorRequestHandler | Array<RequestHandler | ErrorRequestHandler>;
export type ApplicationRequestHandler<T> = IRouterHandler<T> & IRouterMatcher<T> & ((...handlers: RequestHandlerParams[]) => T);

export interface Hooks {
	pre: any;
	post: any;
}

/**
 * @deprecated Use LipthusRequest
 */
export {LipthusRequest as Request} from '../typings/lipthus';

/**
 * @deprecated Use LipthusResponse
 */
export {LipthusResponse as Response} from '../typings/lipthus';

export interface Application extends express.Application {
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

export {NextFunction} from 'express';
