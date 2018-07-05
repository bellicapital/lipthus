"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function leadZero(n, s = 2) {
    return ('0' + n).substr(-s, s);
}
const truncate = require('html-truncate');
const striptags = require("striptags");
// (global as any).l = function () {
// 	console.log.apply(this, arguments);
//
// 	const orig = Error.prepareStackTrace;
// 	Error.prepareStackTrace = function (_, stack) {
// 		return stack;
// 	};
// 	const err = new Error;
// 	Error.captureStackTrace(err);
// 	const stack_ = err.stack;
// 	Error.prepareStackTrace = orig;
//
// 	console.log('called at %s, line %d', stack_[1].getFileName(), stack_[1].getLineNumber());
// };
Object.each = function (o, fn) {
    if (!o)
        return;
    for (const k of Object.keys(o)) {
        fn(k, o[k]);
    }
};
Object.map = function (o, fn) {
    if (!o)
        return;
    const ret = [];
    for (const k of Object.keys(o)) {
        ret.push(fn(k, o[k]));
    }
    return ret;
};
Object.some = function (o, fn) {
    if (!o)
        return;
    Object.keys(o).some(k => fn(k, o[k]));
};
Object.toArray = (o) => Object.keys(o).map(k => ({ key: k, value: o[k] }));
Object.ksort = (o) => Object.keys(o).sort().reduce((r, k) => r[k] = o[k], {});
Object.sort = ((o, fn) => {
    const arr = [];
    Object.keys(o).forEach(k => {
        arr.push({ key: k, value: o[k] });
        delete o[k];
    });
    if (!fn) {
        fn = (a, b) => {
            if (a.value < b.value)
                return -1;
            if (a.value > b.value)
                return 1;
            return 0;
        };
    }
    arr.sort(fn);
    arr.forEach(a => o[a.key] = a.value);
    return o;
});
String.prototype.ucfirst = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
};
/**
 *
 * @param {type} allowedTags
 * @returns {string}
 */
String.prototype.striptags = function (allowedTags) {
    return striptags(this + '', allowedTags);
};
String.prototype.truncate = function (length = 100, opt = {}) {
    if (typeof opt === 'string')
        opt = { ellipsis: opt };
    else if (!opt)
        opt = {};
    let ret = truncate(this, length, opt);
    if (opt.stripTags)
        ret = striptags(ret, opt.allowedTags);
    return ret;
};
Date.prototype.addDays = function (days) {
    this.setDate(this.getDate() + days);
    return this;
};
Date.prototype.toUserDateString = function (intl, sep = '/') {
    let ret;
    const date = this.getDate();
    const month = this.getMonth() + 1;
    if (intl === 'en-US')
        ret = month + sep + date;
    else
        ret = date + sep + month;
    ret += sep + this.getFullYear();
    return ret;
};
Date.prototype.hmFull = Date.prototype.toUserDatetimeString = function (intl, sep) {
    return this.toUserDateString(intl, sep) + ' ' + this.toUserTimeString();
};
Date.prototype.toFormDateString = function () {
    return this.getFullYear() + '-' + leadZero(this.getMonth() + 1) + '-' + leadZero(this.getDate());
};
Date.prototype.toSpanishDatepickerString = function () {
    return leadZero(this.getDate()) + '/' + leadZero(this.getMonth() + 1) + '/' + this.getFullYear();
};
Date.prototype.toFormDateTimeString = function () {
    return this.toFormDateString() + 'T' + this.toUserTimeString();
};
Date.prototype.hm = Date.prototype.toUserTimeString = function () {
    return leadZero(this.getHours()) + ':' + leadZero(this.getMinutes());
};
Number.prototype.size = function () {
    const n = this.valueOf();
    if (!n) {
        return "-";
    }
    const e = Math.floor(Math.log(n) / Math.log(1024));
    return (Math.floor(n / Math.pow(1024, e) * 100) / 100) + ' KMGTP'.charAt(e) + 'B';
};
