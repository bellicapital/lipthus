"use strict";

const FileInfo = require('./file-info');
const mongoose = require('mongoose');
const GridStore = mongoose.mongo.GridStore;
const multimedia = require('multimedia-helper');
const fsp = require('mz/fs');
const path = require('path');
const exec = require('child_process').exec;
const optimage = require('../optimage');
const Bdf = require('./../../modules/bdf');
const Bdi = require('./../../modules/bdi');
const md5 = require('md5');
const debug = require('debug')('site:gridfs-file');

let tmpdir = require('os').tmpdir();

if (tmpdir.substr(-1) !== '/')
	tmpdir += '/';

const videoExt = ['mp4', 'webm'];

class GridFSFile {
	constructor(id, gridStore) {
		this._id = id;

		if (gridStore)
			Object.defineProperty(this, 'gridStore', {
				get: function () {
					return gridStore;
				}
			});
	}

	static get videoExt() {
		return videoExt;
	}

	mTime() {
		if (this.mtime && this.mtime.getTime() !== 0)
			return this.mtime;

		return this.uploadDate;
	}

	get databaseName() {
		return this.gridStore.db.databaseName;
	}

	info(full) {
		const ret = new FileInfo({
			id: this._id + '',
			uri: '/' + this.gridStore.root + '/' + this._id,
			db: this.gridStore.db.eucaDb.name
		});

		if (this.filename) {//loaded
			ret.uri += '/' + this.filename;
			ret.name = this.filename;
			ret.basename = this.basename();
			ret.size = this.length;
			ret.key = this.getKey();
			ret.lastModifiedDate = this.mTime();
			ret.contentType = this.contentType;

			if (this.err)
				ret.error = this.err;

			if (this.metadata) {
				Object.keys(this.metadata).forEach(k => ret[k] = this.metadata[k]);

				if (this.folder === 'videos') {
					ret.thumb = '/videos/' + this.databaseName + '.' + this._id + '/poster.jpg';
					ret.versions = {};

					videoExt.forEach(ext => {
						ret.versions[ext] = '/videos/' + this.databaseName + '.' + (this.versions && this.versions[ext] ? this.versions[ext]._id : this._id) + '/' + ret.basename + '.' + ext;
					});
				}
			} else if (this.thumb)
				ret.thumb = '/bdf/fs/' + this._id + '/thumb/' + ret.basename + '.jpg';
			else if (!this.err && !this.contentType.indexOf('video'))
				ret.error = new Error('video conversion error');

			if (this.thumb && this.thumb.uploadDate)
				ret.thumbTS = this.thumb.uploadDate.getTime();

			if (full) {
				ret.folder = this.folder;
				ret.md5 = this.md5;
				ret.submitter = this.submitter || null;
			}
		} else if (this.loaded)
			return this.error;

		return ret;
	}

	send(req, res) {
		const gs = this.gridStore;

		return this.load()
			.then(() => {
				if (!this.contentType)
					throw 404;

				const date = this.mTime();
				const disposition = req.query.dl ? 'attachment' : 'inline';
				let start = 0;
				let end = this.length - 1;
				let length = this.length;

				res.type(this.contentType);
				res.set('Accept-Ranges', 'bytes');
				res.set('Content-Disposition', disposition + '; filename="' + this.filename + '"');

				if (req.headers.range) {
					const r = /bytes[^\d]*(\d+)-(\d*)?/.exec(req.headers.range);

					if (!r)
						throw new Error('headers.range parse error: ' + req.headers.range);

					start = parseInt(r[1], 10);

					if (r[2])
						end = parseInt(r[2], 10);

					res.status(206);//HTTP/1.1 206 Partial Content
					res.set('Content-Range', 'bytes ' + start + '-' + end + '/' + this.length);
					length = end - start + 1;
				}

				res.set('Last-modified', date.toUTCString());
				res.set('Content-Length', length);
				res.set('Etag', this.length + '-' + date.getTime());
				res.set('Expires', new Date().addDays(60).toUTCString());

				if (this.metadata)
					res.set('X-Content-Duration', this.metadata.duration);

				return gs.open()
					.then(file => file.seek(start))
					.then(file => file.read(length));
			})
			.then(data => res.send(data))
			.catch(err => {
				if (err.message === 'File does not exist')
					err.status = 404;

				return Promise.reject(err);
			});
	}

	toString() {
		let ret = '/' + this.gridStore.root + '/' + this._id;

		if (this.loaded)
			ret += '/' + this.filename;

		return ret;
	}

	/**
	 *
	 * @returns {Promise.GridFSFile}
	 */
	load() {
		if (this.loaded)
			return Promise.resolve(this);

		this.loaded = true;

		return this.collection()
			.then(collection => collection.findOne({_id: this._id}))
			.then(obj => {
				if (!obj)
					return this.setNotFound();

				Object.keys(obj).forEach(i => this[i] = obj[i]);

				if (this.thumb)
					this.thumb = Bdf.fromMongo(this.thumb, {
						collection: this.gridStore.root + '.files',
						id: this._id,
						field: 'thumb'
					});

				return this.getMetadata()
					.then(metadata => {
						if (metadata) {
							//asigna los valores de metadata al primer nivel de objeto
							if (this.metadata)
								Object.keys(this.metadata).forEach(i => this[i] = this.metadata[i]);
						}

						if (this.metadata && this.folder === 'videos')
							this.setVideoVersions();
					})
					.then(() => this);
			});
	}

	setNotFound() {
		this.error = new GridFSFileNotFoundError('File not found ' + this._id);
	}

	getVideoVersion(k, force) {
		if (videoExt.indexOf(k) === -1)
			return Promise.reject(new Error('Version ' + k + ' not implemented'));

		return this.load()
			.then(() => {
				if (this.folder !== 'videos')
					throw new Error(this._id + ' is not a video main file');

				if (!this.versions)
					this.versions = {};

				if (this.versions[k] && !force)
					return this.versions[k];

				return this.checkVideoVersion(k, force);
			});
	}

	setVideoVersions() {
		videoExt.forEach(k => {
			if (this.versions && this.versions[k]) {
				this.versions[k] = new GridFSFile(this.versions[k], new GridStore(this.gridStore.db, this.versions[k], "r", {root: this.gridStore.root}));
				this.versions[k].folder = 'videoversions';
//		} else {
//			this.createVideoVersion(k);
			}
		});
	}

	checkVideoVersion(k, force) {
		if (this.versions && this.versions[k])
			return this.versions[k].load();
		else
			return this.createVideoVersion(k, force);
	}

	/**
	 *
	 * @returns {Promise}
	 */
	getMetadata() {
		return new Promise((ok, ko) => {
			if (this.metadata || ['videos', 'audios'].indexOf(this.folder) === -1)
				return ok(this.metadata);

			this.tmpFile((err, tmpfile) => {
				if (err)
					return ko(err);

				multimedia(tmpfile)
					.then(r => this.update({metadata: r}, err => err ? ko(err) : ok(r)))
					.catch(ko);
			});
		});
	}

	tmpFile() {
		const file = tmpdir + this._id + '_' + this.filename;

		return fsp.access(file)
			.then(() => file)
			.catch(() => {
				return new Promise((ok, ko) => {
					this.gridStore.open((err, gs) => {
						if (err)
							return ko(err);

						gs.seek(0, () => {
							gs.read((err, data) => {
								if (err)
									return ko(err);

								fsp.writeFile(file, data)
									.then(() => {
										debug('tmp file created: ' + file);
										ok(file);
									})
									.catch(ko);
							});
						});
					});
				});
			});
	}

	createVideoVersion(k, force) {
		if (!this.processLog)
			this.processLog = {};

		if (!this.processLog[k])
			this.processLog[k] = {};

		if (this.processLog[k].started) {
			const ellapsed = new Date() - this.processLog[k].started,
				max = force ? 4 * 60000 : 4 * 60 * 60000;

			if (ellapsed < max) {
				const err = new Error(
					this.processLog[k].end ?
						'Could not create version ' + k :
						'Version ' + k + ' is under process. Started: ' + this.processLog[k].started
				);

				if (!this.processLog[k].end)
					err.code = 1;

				return Promise.reject(err);
			}
		}

		this.processLog[k].started = new Date();

		return this.update({processLog: this.processLog})
			.then(() => this.tmpFile())
			.then(tmpFile => {
				let cmd = 'avconv -i "' + tmpFile + '" -y -loglevel error -b:v 1M';

				if (this.metadata.width % 2 || this.metadata.height % 2)
					cmd += ' -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2"';

				cmd += ' -c:v ' + (k === 'mp4' ? 'libx264' : 'libvpx');

				if (this.metadata.audioChannels)
					cmd += ' -b:a 64k' + (k === 'webm' ? ' -c:a libvorbis' : ' -strict experimental');
				else
					cmd += ' -an';

				const id = new mongoose.Types.ObjectId();
				const filename = this.basename(k);
				const newTmpFile = tmpdir + id + '_' + filename;

				cmd += ' "' + newTmpFile + '"';

				this.processLog[k].command = cmd;

				debug('executing cmd: ' + cmd);

				return new Promise((ok, ko) => {
					exec(cmd, (err, stdout, stderr) => {
						this.processLog[k].result = stderr || stdout || 'ok';

						if (err)
							return ko(err);

						fsp.exists(newTmpFile)
							.then(exists => {
								if (!exists)
									return ko(new Error('tmp file not created: ' + newTmpFile));

								const gs = new GridStore(this.gridStore.db, id, filename, "w", {
									root: this.gridStore.root,
									content_type: 'video/' + k
								});

								gs.open((err, gs) => {
									if (err)
										return ko(err);

									gs.writeFile(newTmpFile, err => {
										if (err)
											return ko(err);

										debug('version ' + k + ' written into db: ' + id);

										if (!this.versions)
											this.versions = {};

										this.versions[k] = id;
										this.processLog[k].end = new Date();

										const update = {
											versions: {},
											processLog: this.processLog
										};

										Object.keys(this.versions).forEach(i => {
											if (this.versions[i])
												update.versions[i] = this.versions[i]._id || this.versions[i];
										});

										this.update(update, err => {
											if (err)
												return ko(err);

											this.collection()
												.then(collection => {
													multimedia(newTmpFile)
														.then(metadata => {
															const params = {
																folder: 'videoversions',
																parent: this._id,
																metadata: metadata
															};

															collection.update({_id: id}, {$set: params}, err => {
																if (err)
																	return ko(err);

																fsp.unlink(tmpFile)
																	.catch(console.error.bind(console));

																this.versions[k] = new GridFSFile(id, new GridStore(this.gridStore.db, id, "r", {root: this.gridStore.root}));

																if (videoExt.every(ext => {
																		return !!this.versions[ext];
																	})) {
																	this.gridStore.db.emit('videoProcessed', this);
																}

																ok(this.versions[k]);
															});

															return fsp.unlink(newTmpFile);
														})
														.catch(console.error.bind(console));
												});
										});
									});
								});
							});
					});
				});
			});
	}

	update(params) {
		return this.collection()
			.then(collection => collection.update({_id: this._id}, {$set: params}))
			.then(() => Object.extend(this, params));
	}

	/**
	 * elimina un archivo
	 */
	unlink() {
		if (this.folder === 'videos') {
			return this.load()
				.then(() => Promise.all(Object.keys(this.versions || {}).map(k => this.versions[k].unlink()))
				// permite continuar si la versión no existe
					.catch(err => console.error('Trying to remove a video version... ' + err.message)))
				.then(() => this.gridStore.open())
				.then(gs => gs.unlink());
		}

		return this.gridStore.open()
			.then(gs => gs.unlink());
	}

	collection() {
		return new Promise((ok, ko) => {
			if (this._collection)
				return ok(this._collection);

			this.gridStore.collection((err, c) => {
				if (err)
					return ko(err);

				ok(this._collection = c);
			})
		});
	}

	// alias
	remove() {
		return this.unlink();
	}

	basename(ext) {
		let ret = path.basename(this.filename, path.extname(this.filename));

		if (ext)
			ret += '.' + ext;

		return ret;
	}

	sendThumb(req, res) {
		return this.getThumb()
			.then(thumb => {
				if (!thumb)
					return;

				return thumb.send(req, res);
			});
	}

	sendFrame(req, res, position, opt) {
		this.load()
			.then(() => this.getVideoFrame(position))
			.then(() => {
				const ref = {
					collection: this.gridStore.root + '.files',
					id: this._id,
					field: 'frame_' + number
				};

				return Bdf.fromMongo(bdf, ref).send(req, res, opt);
			}, () => res.status(404).send('Not Found'));
	}

	getKey() {
		return this.uploadDate.getTime().toString();
	}

	getThumb() {
		return this.load()
			.then(() => {
				if (this.thumb) {
					if (!this.thumb.contentType)
						this.thumb.contentType = 'image/jpeg';

					return this.thumb;
				}

				return this.createThumb();
			});
	}

	createThumb() {
		let ret;

		if (this.contentType.indexOf('video') === 0)
			ret = this.getVideoFrame(parseInt(this.duration / 10));
		else if (this.contentType === 'application/pdf')
			ret = this._pdfThumb();
		else
			return Promise.reject(new Error('Can\'t create a thumb of ' + this.filename));

		return ret.then(bdf => {
			if (bdf) {
				bdf.setColRef({
					collection: this.gridStore.root + '.files',
					id: this._id,
					field: 'thumb'
				});

				return this.update({thumb: bdf});
			}
		})
			.then(() => this.thumb);
	}

	getVideoFrame(position) {
		if (position > this.duration)
			return Promise.reject(new Error('Video length is ' + this.duration + ', lower than ' + position));

		let number = parseInt(position * this.fps, 10);

		return this.getVideoFrameByNumber(number);
	}

	getVideoFrameByNumber(number) {
		const Cache = this.gridStore.db.eucaDb.cache;
		const opt = {
			name: number + '_' + this.basename('jpg'),
			tag: 'videoframe',
			source: this._id
		};

		return Cache.findOne(opt)
			.then(cached => {
				if (cached) {
					delete cached.expires;
					delete cached._id;
					delete cached.__v;

					return Bdf.fromMongo(cached);
				}

				return this.tmpFile()
					.then(tmpFile => {
						const tmpFile2 = tmpdir + 'frame_' + number + '_' + this._id + '.jpg';
						const cmd = 'avconv -i "' + tmpFile + '" -f image2 -frames:v 1 -ss ' + ((number - 1 ) / this.fps) + ' ' + tmpFile2;

						debug(cmd);

						return new Promise((ok, ko) => {
							exec(cmd, err => {
								if (err)
									return ko(err);

								fsp.exists(tmpFile2)
									.then(exists => {
										if (!exists)
											return ko(new Error('tmp file not created ' + tmpFile2));

										optimage(tmpFile2)
											.then(buffer => {
												fsp.unlink(tmpFile2);

												const bdi = new Bdi({
													name: opt.name,
													contentType: 'image/jpeg',
													mtime: this.mTime(),
													uploadDate: new Date(),
													size: buffer.length,
													md5: md5(buffer),
													MongoBinData: new mongoose.Types.Buffer(buffer).toObject(),
													width: this.metadata.width,
													height: this.metadata.height,
													tag: 'videoframe',
													source: this._id
												});

												return Cache.create(bdi).then(() => {
													ok(bdi);
												});
											})
											.catch(ko);
									});
							});
						});
					});
			});
	}

	_pdfThumb() {
		const tmpFile2 = tmpdir + 'thumb_' + this._id + '.png';

		return this.tmpFile()
			.then(tmpFile => {
				return new Promise((ok, ko) => {
					const cmd = 'convert -thumbnail 150x150 -background white -alpha remove "' + tmpFile + '"[0] ' + tmpFile2;

					exec(cmd, err => {
						if (err)
							return ko(err);

						fsp.exists(tmpFile2)
							.then(exists => {
								if (!exists)
									return ko(new Error('tmp file not created ' + tmpFile2));

								Bdf.fromFile({
									name: this.basename('png'),
									path: tmpFile2,
									contentType: 'image/png',
									width: 150,
									height: 150,
									mtime: this.mTime()
								})
									.then(bdf => {
										ok(bdf);
									})
									.catch(ko);
							});
					});
				});
			});
	}
}

class GridFSFileNotFoundError extends Error {
	constructor(msg) {
		super(msg);
	}
}

module.exports = GridFSFile;
