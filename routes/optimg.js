"use strict";

const optimage = require('../lib/optimage');
const fs = require('fs');
const Mime = require('mime');
const {BinDataImage} = require('../modules');

module.exports = function(req, res, next){
	const opt = {
			tag: 'opt-local-image',
			name: req.params.fn
		};

	const file = req.site.dir + '/public/img/' + opt.name;

	fs.stat(file, (err, stat) => {
		if (!stat)
			return res.status(404).send('not found');

		opt.mtime = stat.mtime;

		req.db.cache
			.findOne(opt)
			.then(cached => cached ||
				optimage(file)
					.then(r =>
						req.db.cache.create(Object.extend(opt, {
							contentType: Mime.lookup(opt.name),
							MongoBinData: r,
							size: r.length
						}))
					)
			)
			.then(cached => {
				BinDataImage.fromMongo(cached).send(req, res);
			})
			.catch(next);
	});
};
