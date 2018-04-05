"use strict";

const {GridFSFile} = require('../lib');

module.exports = function fsfiles(Schema){
	const s = new Schema({
		filename: String,
		contentType: String,
		folder: String,
		length: Number,
		chunkSize: Number,
		uploadDate: Date,
		md5: String,
		metadata: {},
		items: [{
			$ref: String,
			$id: Schema.Types.ObjectId,
			$db: String
		}],
		processLog: {},
		versions: {
			mp4: {type: Schema.Types.ObjectId, ref: 'fsfiles' },
			webm: {type: Schema.Types.ObjectId, ref: 'fsfiles' }
		},
		thumb: {},
		parent: {type: Schema.Types.ObjectId, ref: 'fsfiles' }
	}, {
		collection: 'fs.files',
		created: true,
		submitter: true
	});

	s.statics = {
		check: function(repair){
			const ret = {
				videos: 0,
				versions: 0,
				versioned: 0,
				unversioned: 0,
				orphanVersions: 0,
				wrongParents: 0,
				missingVersions: 0,
				errorVersions: 0
			};

			const versioned = {};

			return this.find({folder: 'videos'})
				.select('versions items')
				.populate('versions.mp4 versions.webm', '_id')
				.then(videos => {
					ret.videos = videos.length;

					const prom = [];
					let vv;

					videos.forEach(v => {
						GridFSFile.videoExt.forEach(ext => {
							if (!v.versions[ext]) {
								ret.unversioned++;

								if (repair && !vv) {
									vv = true;//sólo una versión por cada ejecución

									prom.push(v.createVideoVersion(ext, true));
								}
							} else {
								versioned[v.versions[ext]._id] = true;

								const p = this.findById(v.versions[ext]._id)
									.select('folder parent')
									.then(version => {
										if(!version)
											return ret.missingVersions++;

										if(version.folder !== 'videoversions' || !version.parent.equals(v._id)) {
											ret.errorVersions++;

											if(repair)
												return version.set({folder: 'videoversions', parent: v._id}).save();
										}
									});

								prom.push(p);
							}
						});
					});

					return Promise.all(prom);
				})
				.then(() => this.find({folder: 'videoversions'}, 'parent').populate('parent', '_id'))
				.then(versions => {
					ret.versions = versions.length;

					versions.forEach(function(v){
						if(!v.parent)
							ret.orphanVersions++;
						else if(!versioned[v._id])
							ret.wrongParents++;
					});

					ret.versioned = Object.keys(versioned).length;

					return ret;
				});
		},
		repair: function(){
			let vv;
			const versioned = {};

			this.find({folder: 'videos'}, 'versions items')
				.populate('versions.mp4 versions.webm', '_id')
				.then(videos => {
					videos.forEach(function (v) {
						GridFSFile.videoExt.forEach(function (ext) {
							if (!v.versions[ext]) {
								if (!vv) {
									vv = true;//sólo una versión por cada ejecución

									v.createVideoVersion(ext, true, function (err) {
										if (err)
											console.error(err);
									});
								}
							} else
								versioned[v.versions[ext]._id] = true;
						});
					});
				})
				.then(() => {
					return this
						.find({folder: 'videoversions'}, 'parent')
						.populate('parent', '_id')
						.then(versions => {
							versions.forEach(function (v) {
								if (!v.parent || !versioned[v._id])
									v.unlink();
							});
						})
						.then(this.check.bind(this));
				});
		}
	};

	s.methods = {
		getItems: function(fields){
			if(!this.items || !this.items.length)
				return Promise.resolve([]);

			let db;
			const thisdb = this.db.eucaDb;
			const dbs = this.db.eucaDb.site.dbs;
			const items = this.get('items');
			const ret = [];

			const p = items.map(item => {
				item = item.toObject();

				db = item.db ? dbs[item.db] : thisdb;

				return db[item.namespace.replace('dynobjects.', '')]
					.findById(item.oid)
					.select(fields)
					.then(r => r && ret.push(r))
			});

			return Promise.all(p).then(() => ret);
		},
		unlink: function(cb){
			this.fsFile((err, file) => {
				if(err)
					return cb(err);

//				file.unlink(function(err){
//					if(err)
//						return cb(err);

					this.getItemFields((err, items) => {
						if(err)
							return cb(err);
					});
//				});
			});
		},
		getItemFields: function(cb){
			const ret = [];

			if(!this.items || !this.items.length)
				return cb(null, ret);

			const dbs = this.db.eucaDb.site.dbs;
			const dbname = this.db.name;
			let error;

			this.items.forEach(item => {
				item = item.toObject();

				const db = dbs[item.db || dbname];

				if(!db)
					return (error = new Error('Db ' + item.db + ' not found'));

				const schema = db.schemas[item.namespace.replace('dynobjects.', '')];

				if(!schema)
					return (error = new Error('Schema ' + schema + ' not found'));

				const fields = schema.fileFields();

				if(!fields)
					return (error = new Error('Field ' + item.field + ' not found'));
			});
		},
		/**
		 *
		 * @returns {Promise}
		 */
		fsFile: function(){
			return new Promise((ok, ko) => {
				this.db.eucaDb.fs.get(this._id)
					.load((err, gridfsfile) => err ? ko(err) : ok(gridfsfile));
			});
		},
		createVideoVersion: function(ext, force){
			return this.fsFile()
				.then(file => file.createVideoVersion(ext, force));
		},
		/**
		 *
		 * @returns {Promise}
		 */
		chunksCount: function(){
			return this.db.collection('fs.chunks').count({files_id: this._id});
		}
	};

	return s;
};
