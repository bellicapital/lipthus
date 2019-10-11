import * as Debug from "debug";

import {promises as fsPromises} from "fs";

const debug = Debug('site:w3c');
const os = require('os');
const md5 = require('md5');
const w3cjs = require('w3cjs');
const {util} = require('./util');
const tmpdir = os.tmpdir() + '/w3cv/';

fsPromises.mkdir(tmpdir).catch((err: any) => {
	if (err.code !== 'EEXIST')
		throw err;
});

const w3c = {
	results: {},

	getUrl(this: any, uri: string) {
		return this.req.site.externalProtocol + '://' + this.req.headers.host + uri;
	},

	get(uri: string, sec: number) {
		const file = w3c.getUrl.call(this, uri);

		return w3c.getCached(file)
			.then((cached: any) => {
				debug('cached', !!cached);

				if (cached && (!sec || cached.time > Date.now() - sec * 1000))
					return cached;

				return w3c.validate(file);
			});
	},

	ajaxErrorCount(uri: string) {
		return w3c.get.call(this, uri, 30).then((r: any) => ({count: r.errors}));
	},

	validate(uri: string) {
		debug('validating', uri);

		return util.urlContent(uri)
			.then((str: string) => new Promise((ok, ko) => {
				w3cjs.validate({
					input: str,
					callback: (err: Error, c: any) => {
						try {
							c.url = uri;
							c.time = Date.now();
							c.errors = 0;

							c.messages.forEach((m: any) => {
								if (m.type === 'error' || m.subType)
									c.errors++;
							});

							w3c.cach(uri, c).then(ok, ko);
						} catch (err) {
							console.error('w3c response', c);
							ko(err);
						}
					}
				});
			}));
	},

	cach(uri: string, content: any) {
		const filename = tmpdir + md5(uri);

		debug('writing tmp file', filename);

		return fsPromises.writeFile(filename, JSON.stringify(content))
			.then(() => {
				debug('file written');

				return content;
			});
	},

	getCached(uri: string) {
		const file = tmpdir + md5(uri);

		return fsPromises.access(file)
			.then(() => {
				return fsPromises.readFile(file, 'utf8')
					.then((r: any) => {
						debug('read cached', uri);

						return JSON.parse(r);
					});
			}, () => true); // no devolvemos el error porque no esté cacheado
	}
};

export default w3c;
