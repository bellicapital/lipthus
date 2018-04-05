import {LipthusRequest, LipthusResponse} from "../index";
import {NextFunction} from "express";
import {Types} from "mongoose";
import * as Url from "url";
import * as https from "https";
import * as http from "http";
import {IncomingMessage} from "http";

const ObjectId = Types.ObjectId;

export namespace util {
	export class CastErr404 extends Error {
		
		public status = 404;
		public static code = 404;
		
		constructor(v: string) {
			super('ObjectId ' + v + ' is not valid');
		}
	}
	
	export function objectIdMw(req: LipthusRequest, res: LipthusResponse, next: NextFunction) {
		const id = req.params.id || req.query.id;
		
		return next(ObjectId.isValid(id) ? null : new CastErr404(id));
	}
	
	export function urlContent(url: string | any, encoding?: string) {
		return new Promise((resolve, reject) => {
			if (typeof url === 'string')
				url = Url.parse(url);
			
			const p: any = url.protocol === 'https:' ? https : http;
			
			p.get(url, (response: IncomingMessage) => {
				if (encoding)
					response.setEncoding(encoding);
				
				let body = '';
				response.on('data', d => body += d);
				response.on('end', () => resolve(body));
			})
				.on('error', (err: Error) => {
					// handle errors with the request itself
					console.error('Error with the request:', err.message);
					reject(err);
				});
		});
	}
}
