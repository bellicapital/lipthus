#!/usr/bin/env node

"use strict";

const express = require('express');
const server = require('./lib/server');

module.paths.push('/usr/local/lib/node_modules');

if(!process.env.TMPDIR)
	process.env.TMPDIR = '/tmp';

const Site = require('./modules/site');
const listen = require('./modules/listen');

if(!process.env.NODE_ENV)
	process.env.NODE_ENV = 'development';

if(!process.env.TMPDIR)
	process.env.TMPDIR = '/tmp/';

if(process.env.TMPDIR.substr(-1) !== '/')
	process.env.TMPDIR += '/';

process.on('warning', (warning) => {
	console.warn(warning.name);
	console.warn(warning.message);
	console.warn(warning.stack);
});

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

require ('./modules/functions');

module.exports = exports = function createSite(dir, options){
	return server.check()
		.then(() => {
			return new Site(dir).init(options);
		})
		.catch(console.error.bind(console));
};

exports.Site = Site;
exports.dir = __dirname;
exports.listen = listen;
exports.express = express;