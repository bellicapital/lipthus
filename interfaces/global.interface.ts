import {IRouterHandler, IRouterMatcher, NextFunction} from "express-serve-static-core";
import {LipthusApplication, LipthusDb, LipthusRequest, LipthusResponse, Site} from "../index";
import {Connection, Types} from "mongoose";

export type RequestHandler = (req: LipthusRequest, res: LipthusResponse, next: NextFunction) => any;
export type ErrorRequestHandler = (err: any, req: LipthusRequest, res: LipthusResponse, next: NextFunction) => any;

export type RequestHandlerParams = RequestHandler | ErrorRequestHandler | Array<RequestHandler | ErrorRequestHandler>;
export type ApplicationRequestHandler<T> = IRouterHandler<T> & IRouterMatcher<T> & ((...handlers: RequestHandlerParams[]) => T);

export interface Hooks {
	pre: any;
	post: any;
}

export interface KeyString {
	[s: string]: string;
}

export interface KeyAny {
	[s: string]: any;
}

export interface CssResponse {
	css: string;
	map: string;
	imports: Array<string>;
}

export interface DbParams {
	name: string;
	user?: string;
	pass?: string;
	host?: string;
	port?: string;
	options?: any;	// ex: {authSource: "admin"}
}

export interface EnvironmentParams {

	production: boolean;
	db: DbParams;
	domain: string;
	protocol?: string;
	externalProtocol?: string;
	port?: number;
	socket?: string;
	mail?: any;
	language?: string;
	urls?: KeyString;	// base url 4 language code
	translator?: {
		dbs: Array<string>,
		exclude: Array<string>
	};
	origin?: string | false;	// Access-Control-Allow-Origin
	allowHeaders?: Array<string>;
	customSitemap?: boolean;
	VAPID?: {
		publicKey: string,
		privateKey: string
	};
	authDb?: string;
	customData?: any;
}

export interface ColRef {
	db?: string;
	collection: string;
	id: Types.ObjectId | string;
	field: string;
}

export interface LipthusConnection extends Connection {
	lipthusDb: LipthusDb;
	eucaDb?: LipthusDb; // deprecated
	site: Site;
	app: LipthusApplication;
}
