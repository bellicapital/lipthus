"use strict";

const fs = require('mz/fs');
const path = require('path');
const less = require('less');
const md5 = require('md5');
const debug = require('debug')('site:css');

module.exports = function cacheless(Schema){
	const s = new Schema({
		mtime: Number,
		source: {type: String, index: true, unique: true},
		compress: Boolean,
		varsmd5: String,
		content: {}
	}, {
		collection: 'cache.less'
	});

	s.statics = {
		getCachedFile: function(file, compress){
			return fs.stat(file)
				.then(stat => this.getCached({
					src: file,
					compress: compress,
					code: '@import "' + file + '";',
					mtime: stat.mtime.getTime() / 1000,
					mapUrl: path.basename(file, '.less') + '.map'
				}));
		},
		getCachedFiles: function(files, basename){
			let code = '';
			let mtime = 0;

			const promises = [];

			files.forEach(file => {
				promises.push(fs.stat(file));

				code += '@import "' + file + '";';
			});

			return Promise.all(promises)
				.then(
					v => {
						v.forEach(stat => {
							if (stat.mtime > mtime)
								mtime = stat.mtime;
						});

						mtime = Math.floor(mtime.getTime() / 1000);

						return this.getCached({
							src: basename,
							compress: true,
							code: code,
							mtime: mtime,
							mapUrl: '/css/' + basename + '.' + mtime + '.map'
						});
					},
					err => {
						if(err.code === 'ENOENT'){
							err.status = 404;
							debug(err.message);
						}

						throw err;
					});
		},
		getCached: function(opt){
			const src = opt.src;
			const compress = opt.compress;
			const mtime = opt.mtime;
			const db = this.db.eucaDb;
			const mapUrl = opt.mapUrl;
			const site = db.site;

			return db.cacheless
				.findOne({source: src})
				.then(cached => {
					const lessVars = site.lessVars();
					const varsmd5 = md5(JSON.stringify(lessVars));

					if(
						cached
						&& cached.mtime >= mtime
						&& cached.compress === compress
						&& cached.varsmd5 === varsmd5
					)
						return cached.content;

					const lessopt = {
						compress: compress,
						globalVars: lessVars,
						sourceMap: {sourceMapURL: mapUrl},
						sourceMapMapInline: true
					};

					return less.render(opt.code, lessopt)
						.then(r => {
							const update = {
								source: src,
								mtime: mtime,
								varsmd5: varsmd5,
								content: r,
								compress: compress
							};

							return db.cacheless.update({source: src}, update, {upsert: true})
								.then(() => r);
						},
						err => {
							throw new Error('Less render - ' + err.message + '\n' + JSON.stringify(err, null, '\t'));
						});
				});
		}
	};

	return s;
};
