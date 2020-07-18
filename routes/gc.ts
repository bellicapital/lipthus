import {LipthusRequest, LipthusResponse} from "../index";

export function gc (req: LipthusRequest, res: LipthusResponse) {
	let ret = '<h1>Garbage collector</h1><br>';
	let _gc = global.gc;
	if (!_gc) {
		ret += '<h5>custom</h5>';
		const v8 = require("v8");
		const vm = require('vm');

		v8.setFlagsFromString('--expose_gc');
		_gc = vm.runInNewContext('gc');
	}

	ret += htmlUsage() + '<br>';

	if (req.query.now) {
		// @ts-ignore
		_gc(req.query.now === "2");
		ret += '<h3>After:</h3>' + htmlUsage() + '<br><a href="?_=' + Date.now() + '">Ok</a><br>';
	} else
		ret += '<a href="?now=1&_=' + Date.now() + '">GC Now!</a><br><a href="?now=2&_=' + Date.now() + '">GC Full Now!</a><br>';

	res.send(ret);
}

function hm(n: number) {
	const ret = n / 1024 / 1024;
	return (Math.round(ret * 100) / 100) + 'MB';
}

function htmlUsage() {
	let ret = '<table>';
	const json: any = process.memoryUsage();
	Object.keys(json).forEach(k => ret += '<tr><td>' + k + ': </td><td>' + hm(json[k]) + '</td></tr>');

	return ret + '</table>';
}
