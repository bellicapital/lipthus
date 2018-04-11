import {IRouterHandler, IRouterMatcher, NextFunction} from "express-serve-static-core";
import {LipthusRequest, LipthusResponse} from "../index";

export type RequestHandler = (req: LipthusRequest, res: LipthusResponse, next: NextFunction) => any;
export type ErrorRequestHandler = (err: any, req: LipthusRequest, res: LipthusResponse, next: NextFunction) => any;

export type RequestHandlerParams = RequestHandler | ErrorRequestHandler | Array<RequestHandler | ErrorRequestHandler>;
export type ApplicationRequestHandler<T> = IRouterHandler<T> & IRouterMatcher<T> & ((...handlers: RequestHandlerParams[]) => T);

export interface Hooks {
	pre: any;
	post: any;
}