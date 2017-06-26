#!/usr/bin/env node

"use strict";

const express = require('express');
const server = require('./lib/server');

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

export function lipthusSite(dir:string, options?: any){
	return server.check()
		.then(() => {
			return new Site(dir).init(options);
		});
}

exports.Site = Site;
exports.dir = __dirname;
export const dir = __dirname;