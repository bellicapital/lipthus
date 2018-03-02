import * as express from "express";
import {Site, LipthusDb} from "../modules";
import {ApplicationRequestHandler} from "../interfaces/global.interface";

declare interface LipthusRequest extends express.Request {
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

declare interface LipthusResponse extends express.Response {
	now: number;
	htmlPage: any;
}

declare interface LipthusApplication extends express.Application {
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
