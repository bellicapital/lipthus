import * as Url from "url";
import * as https from "https";
import * as http from "http";
import {IncomingMessage} from "http";

export namespace util {

	export function urlContent(url: string | any, encoding?: BufferEncoding) {
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
