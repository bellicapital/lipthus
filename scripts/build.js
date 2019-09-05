const copyfiles = require('copyfiles');

copyfiles([
	'package.json',
	// 'modules/*.js',
	'modules/**/*.js',
	'routes/*.js',
	'routes/**/*.js',
	'schemas/*.js',
	'dist'
], (err) => {
	if (err)
		console.error(err);

	// noinspection JSFileReferences
	require('../dist/lib/server');
});
