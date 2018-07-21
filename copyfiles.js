console.log('copyfiles');

const copyfiles = require('copyfiles');

copyfiles([
	'package.json',
	'modules/*.js',
	'modules/**/*.js',
	'routes/*.js',
	'routes/**/*.js',
	'schemas/*.js',
	'dist'
], (err, r) => {
	console.log('error', err);
	console.log('result', r);
});
