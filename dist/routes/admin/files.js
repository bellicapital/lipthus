"use strict";

module.exports = function(req, res, next){
	res.htmlPage
		.init({
			jQueryMobile: true,
			pageTitle: 'Files',
			layout: 'base',
			view: 'admin/files',
			userLevel: 3
		})
		.then(page => page.addCSS('files'))
		.then(page => {
			const p = req.path.substr(1).split('/');
			let query = {};//{folder: {$ne: 'videoversions'}};

			if (!p[1]) {
				return req.db.fsfiles.distinctCount('folder', query)
					.then(folders => res.locals.folders = folders)
					.then(() => req.db.fsfiles.distinctCount('items.$ref', query))
					.then(schemas => res.locals.schemas = schemas)
					.then(() => page.send());
			}

			let val = p[2];

			if (val === 'null')
				val = null;

			switch(p[1]){
				case 'folders':
					if (val !== 'files')
						page.pageTitle += ' - ' + val;

					query.folder = val;
					break;

				case 'schemas':
					query['items.$ref'] = val;

					page.pageTitle += ' - ' + (val ? val.replace('dynobjects.', '') : 'No Item');

					break;

				case 'unversioned':
					query = {
						folder: 'videos',
						$or: [{"versions.mp4": null}, {"versions.webm": null}]
					};

					page.pageTitle += ' - Unversioned';

					break;

				case 'check':
				case 'repair':
					return req.db.fsfiles
						.check(p[1] === 'repair')
						.then(result => {
							res.locals.check = result;

							page.pageTitle += ' - Check results';

							page.send();
						});

				default:
					return next();
			}

			return req.db.fsfiles.find(query)
				.select('filename length items thumb')
				.limit(10)
				.then(files => {
					res.locals.files = [];

					files.map(f => f.getItems('title')
						.then(items => res.locals.files.push({
							_id: f._id,
							filename: f.filename,
							length: f.length.size(),
							item: items[0] && items[0].title,
							thumb: !!f.thumb
						}))
					);
				})
				.then(() => page.send());
		})
		.catch(next);
};