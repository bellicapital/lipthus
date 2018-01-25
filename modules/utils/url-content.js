"use strict";

const http = require('http');
const https = require('https');
const Url = require('url');

module.exports = (url, encoding) => {
	return new Promise((resolve, reject) => {
		if(typeof url === 'string')
			url = Url.parse(url);

		const p = url.protocol === 'https:' ? https : http;

		p.get(url, response => {
			encoding && response.setEncoding(encoding);

			let body = '';
			response.on('data', d => body += d);
			response.on('end', () => resolve(body));
		})
			.on('error', err => {
				// handle errors with the request itself
				console.error('Error with the request:', err.message);
				reject(err);
			});
	});
};
