"use strict";

const path = require('path');
const GridFSFile = require('../lib/gridfs').GridFSFile;
const mongoose = require('mongoose');

module.exports = function(req, res, next){
	let id = req.params.id;
	
	if(!id)
		return next(new Error('No id param'));

	let ext = req.params.type;
	
	if(!ext && /^.+\.\w+$/.test(id)){
		const tmp = id.split('.');
		
		if(tmp[1].length < 5){
			id = tmp[0];
			ext = tmp[1];
		}
	}
	
	const m = id.match(/(^[^\.]+)\.(.+)$/);
	const dbname = m && m[1] || req.site.db.name;
	
	if(m)
		id = m[2];

	if(!req.site.dbs[dbname] || !mongoose.Types.ObjectId.isValid(id))
		return next();
	
	req.site.dbs[dbname].fs.get(id).load()
		.then(file => {
			if(!file)
				return next();

			if(!ext)
				return res.redirect('/videos/' + (dbname !== req.site.db.name ? dbname + '.' : '') + id + '/' + file.filename);

			if(ext.indexOf('poster') === 0){
				const opt = {
					width: file.width,
					height: file.height,
					crop: true
				};

				const r = /^poster(\d+)x?(\d*)/.exec(ext);

				if(r){
					opt.width = parseInt(r[1]);
					opt.height = parseInt(r[2]) || (file.height * opt.width / file.width);
				}

				return file.sendThumb(req, res, opt, next);
			} else if(ext === 'tag'){
				res.locals = {
					poster: 'http://' + req.headers.host + '/videos/' + file._id + '/poster.jpg',
					mp4: 'http://' + req.headers.host + file.versions.mp4,
					webm: 'http://' + req.headers.host + file.versions.webm
				};

				return res.render(req.cmsDir + '/views/videotag');
			} else if(/^f_\d+_/.test(ext)){//frames
				const parsed = /^f_(\d+)_(\d*)x?(\d*)(k?)/.exec(ext);
				const frame = parseInt(parsed[1]);

				if(parsed[2])
					opt = {
						width: parseInt(parsed[2]),
						height: parseInt(parsed[3]),
						crop: !!parsed[3]
					};

				return file.sendFrame(req, res, frame, opt);
			}

			if(ext.indexOf('.') !== -1)
				ext = path.extname(ext).substr(1);

			if(GridFSFile.videoExt.indexOf(ext) === -1 || file.folder !== 'videos')
				return file.send(req, res);

			return file.getVideoVersion(ext, !!req.query.force)
				.then(version => version.send(req, res))
				.catch(err => {
					if(err.code === 1)//version processing
						res.set("Retry-After", 120).status(503);
					else
						throw err;

					return res.send(err.message);
				});
		})
		.catch(next);
};