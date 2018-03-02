

declare module "express-device" {
	import {Application} from "express";
	
	function capture(): any;
	// noinspection JSUnusedLocalSymbols
	function enableDeviceHelpers(app: Application): void;
}

