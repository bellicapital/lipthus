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
], (err) => {
	if (err)
		console.error(err);

	require('../dist/lib/server');
});
