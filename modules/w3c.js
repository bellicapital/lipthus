"use strict";

const fs = require('mz/fs');
const os = require('os');
const md5 = require('md5');
const w3cjs = require('w3cjs');
const debug = require('debug')('site:w3c');
const urlContent = require('./utils').urlContent;
const tmpdir = os.tmpdir() + '/w3cv/';

fs.mkdir(tmpdir).catch(err => {
	if (err.code !== 'EEXIST')
		throw err;
});

const w3c = {
	results: {},

	getUrl: (uri) => this.req.site.externalProtocol + '://' + this.req.headers.host + uri,

	get(uri, sec) {
		const file = w3c.getUrl.call(this, uri);

		return w3c.getCached(file)
			.then(cached => {
				debug('cached', !!cached);

				if (cached && (!sec || cached.time > Date.now() - sec * 1000))
					return cached;

				return w3c.validate(file);
			});
	},

	ajaxErrorCount: (uri) => w3c.get(this.req, uri, 30).then(r => ({count: r.errors})),

	validate(uri) {
		debug('validating', uri);

		return urlContent(uri)
			.then(str => new Promise((ok, ko) => {
				w3cjs.validate({
					input: str,
					callback: (err, c) => {
						try {
							c.url = uri;
							c.time = Date.now();
							c.errors = 0;

							c.messages.forEach(m => {
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

	cach(uri, content) {
		const filename = tmpdir + md5(uri);

		debug('writing tmp file', filename);

		return fs.writeFile(filename, JSON.stringify(content))
			.then(() => {
				debug('file written');

				return content;
			});
	},

	getCached(uri) {
		let file = tmpdir + md5(uri);

		return fs.access(file)
			.then(() => {
				return fs.readFile(file, 'utf8')
					.then(r => {
						debug('read cached', uri);

						return JSON.parse(r);
					});
			}, () => true);// no devolvemos el error porque no esté cacheado
	}
};

module.exports = w3c;
