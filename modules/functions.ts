"use strict";

const truncate = require('html-truncate');
const striptags = require('striptags');

(global as any).t = console.trace;

(global as any).l = function(){
	console.log.apply(this, arguments);

	const orig = Error.prepareStackTrace;
	Error.prepareStackTrace = function(_, stack) { return stack; };
	const err = new Error;
	Error.captureStackTrace(err);
	const stack_ = err.stack;
	Error.prepareStackTrace = orig;

	console.log('called at %s, line %d', stack_[1].getFileName(), stack_[1].getLineNumber());
};

Object.each = function(o, fn){
	if(!o)
		return;

	for(let k of Object.keys(o)){
		fn(k, o[k]);
	}
};

Object.map = function(o, fn){
	if(!o)
		return;

	const ret = [];

	for(let k of Object.keys(o)){
		ret.push(fn(k, o[k]));
	}

	return ret;
};

Object.some = function(o, fn){
	if(!o)
		return;

	Object.keys(o).some(k => fn(k, o[k]));
};

Object.extend = function(a, b){
	if(!b){
		b = a;
		a = {};
	}

	for(let k of Object.keys(b)){
		a[k] = b[k];
	}

	return a;
};

Object.toArray = o => {
	const ret = [];

	Object.each(o, (k, v) => ret.push({key: k, value: v}));

	return ret;
};

Object.ksort = function(o) {
	//noinspection CommaExpressionJS
	return Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {});
};

String.prototype.ucfirst = function() {
	return this.charAt(0).toUpperCase() + this.slice(1);
};

Object.sort = ((o, fn) => {
	const arr = [];

	Object.keys(o).forEach(k => {
		arr.push({key: k, value: o[k]});
		delete o[k];
	});

	if(!fn) {
		fn = (a, b) => {
			if(a.value < b.value)
				return -1;
			if(a.value > b.value)
				return 1;
			return 0;
		};
	}

	arr.sort(fn);

	arr.forEach(a => o[a.key] = a.value);

	return o;
});

/**
 *
 * @param {type} allowedTags
 * @returns {string}
 */
String.prototype.striptags = function(allowedTags) {
	return striptags(this, allowedTags);
};

String.prototype.truncate = function(length, opt) {
	if(typeof opt === 'string')
		opt = {ellipsis: opt};
	else if(!opt)
		opt = {};

	let ret = truncate(this, length || 100, opt);

	if(opt.stripTags)
		ret = striptags(ret, opt.allowedTags);

	return ret;
};
