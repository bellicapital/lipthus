"use strict";

const path = require('path');

module.exports = function(req, res, next){
	res.htmlPage.init({
		jQueryMobile: true,
		jQueryMobileTheme: 'default',
		layout: 'base',
		view: 'admin/file',
		userLevel: 3
	});

	const p = req.path.substr(1).split('/');
	const id = p[1];

	const getVersion = id => {
		if(!id)
			return Promise.resolve({
				id: file._id,
				label: 'create'
			});

		return req.db.fsfiles
			.findById(id)
			.then(version => {
				if(version)
					return {
						id: version._id,
						label: 'ok'
					};

				return {
					id: file._id,
					label: 'repair'
				};
			});
	};

	let file;

	req.db.fsfiles
		.findById(id)
		.then(f => {
			if (!f)
				throw 404;

			file = f;

			res.locals.file = file.toObject();
		})
		.then(() => {
			// solución temporal a algunos nombre que incluyen slash
			if(/\//.test(file.filename))
				return file.set('filename', path.basename(file.filename))
					.save();
		})
		.then(() => file.chunksCount())
		.then(count => {
			if (!count)
				res.locals.file.error = new Error('no chunks found for file, possibly corrupt!');
		})
		.then(() => file.getItems('title'))
		.then(items => res.locals.file.items = items)
		.then(() => {
			switch(file.folder) {
				case 'videos':
					if (!res.locals.file.versions)
						res.locals.file.versions = {};

					const p = ['mp4', 'webm'].map(k => {
						return getVersion(res.locals.file.versions[k])
							.then(v => res.locals.file.versions[k] = v);
					});

					return Promise.all(p);

				case 'videoversions':
					if (file.parent)
						return file.populate('parent', 'filename')
							.execPopulate()
							.then(res.locals.file.parent = file.parent);
					else {
						const query = {};

						query['versions.' + file.contentType.substr(5)] = file.parent;

						return req.db.fsfiles
							.findOne(query)
							.select('filename')
							.then(parent => {
								if (!parent) {
									res.locals.file.error = new Error('Unrecoverable orphan video version found');
								} else {
									res.locals.file.parent = file.parent;

									return file.set('parent', parent).save();
								}
							});
					}
			}
		})
		.then(() => res.htmlPage.addCSS('files')
			.addJS('file.js')
			.send()
		)
		.catch(next);
};