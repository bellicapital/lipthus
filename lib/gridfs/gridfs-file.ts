import {FileInfo} from "./file-info";
import {Collection, Types} from "mongoose";
import * as path from "path";
import {exec} from "child_process";
import {BinDataFile, BinDataImage} from "../../modules";
import * as md5 from "md5";
import * as debug0 from "debug";
import {LipthusRequest, LipthusResponse} from "../../index";
import {LipthusError} from "../../classes/lipthus-error";
import {optimage} from "../optimage";

const GridStore = require('mongodb').GridStore;
const multimedia = require('multimedia-helper');
const fsp = require('mz/fs');
const debug = debug0('site:gridfs-file');

let tmpdir = require('os').tmpdir();

if (tmpdir.substr(-1) !== '/')
	tmpdir += '/';

const videoExt = ['mp4', 'webm'];

export class GridFSFile {

	public mtime?: Date;
	public uploadDate?: Date;
	public filename?: string;
	public length = 0;
	public contentType = '';
	public folder?: string;
	public err?: Error;
	public metadata?: any;
	public thumb?: any;
	public versions?: { [s: string]: GridFSFile | Types.ObjectId };
	public md5?: string;
	public submitter?: string;
	public loaded = false;
	public error?: Error;
	private _collection?: Collection;
	private processLog: any = {};
	private duration?: number;
	private fps?: number;

	constructor(public _id: string | Types.ObjectId, public gridStore: any) {
	}

	static get videoExt() {
		return videoExt;
	}

	mTime(): Date {
		if (this.mtime && this.mtime.getTime() !== 0)
			return this.mtime;

		if (!this.uploadDate)
			this.uploadDate = new Date();

		return this.uploadDate;
	}

	get databaseName(): string {
		return this.gridStore.db.databaseName;
	}

	info(full: boolean): FileInfo {
		const ret = new FileInfo({
			id: this._id + '',
			uri: '/' + this.gridStore.root + '/' + this._id,
			db: this.gridStore.db.eucaDb.name
		});

		if (this.filename) { // loaded
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
				Object.assign(ret, this.metadata);

				if (this.folder === 'videos') {
					ret.thumb = '/videos/' + this.databaseName + '.' + this._id + '/poster.jpg';
					ret.versions = {};

					videoExt.forEach(ext => {
						ret.versions[ext] = '/videos/' + this.databaseName + '.' +
							(this.versions && this.versions[ext] ? (this.versions[ext] as GridFSFile)._id : this._id) + '/' + ret.basename + '.' + ext;
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
				ret.submitter = this.submitter || undefined;
			}
		} else if (this.loaded)
			ret.error = this.err;

		return ret;
	}

	send(req: LipthusRequest, res: LipthusResponse) {
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
					const r = /bytes[^\d]*(\d+)-(\d*)?/.exec(req.headers.range.toString());

					if (!r)
						throw new Error('headers.range parse error: ' + req.headers.range);

					start = parseInt(r[1], 10);

					if (r[2])
						end = parseInt(r[2], 10);

					res.status(206); // HTTP/1.1 206 Partial Content
					res.set('Content-Range', 'bytes ' + start + '-' + end + '/' + this.length);
					length = end - start + 1;
				}

				res.set('Last-modified', date.toUTCString());
				res.set('Content-Length', length.toString());
				res.set('Etag', this.length + '-' + date.getTime());
				res.set('Expires', new Date().addDays(60).toUTCString());

				if (this.metadata)
					res.set('X-Content-Duration', this.metadata.duration);

				return gs.open()
					.then((file: any) => file.seek(start))
					.then((file: any) => file.read(length));
			})
			.then((data: any) => {
				res.send(data);
			})
			.catch((err: LipthusError) => {
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
	 * @returns {Promise.any}
	 */
	load(): Promise<GridFSFile> {
		if (this.loaded)
			return Promise.resolve(this);

		this.loaded = true;

		return this.collection()
			.then(collection => collection.findOne({_id: this._id}))
			.then((obj: any) => {
				if (!obj)
					return this.setNotFound();

				Object.keys(obj).forEach(i => (this as any)[i] = obj[i]);

				if (this.thumb)
					this.thumb = BinDataFile.fromMongo(this.thumb, {
						collection: this.gridStore.root + '.files',
						id: this._id,
						field: 'thumb',
						db: this.databaseName
					});

				return this.getMetadata()
					.then(() => {
						if (this.metadata && this.folder === 'videos')
							this.setVideoVersions();
					});
			})
			.then(() => this);
	}

	setNotFound() {
		this.error = new GridFSFileNotFoundError('File not found ' + this._id);
	}

	getVideoVersion(k: string, force: boolean) {
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
				this.versions[k] = new GridFSFile(this.versions[k] as Types.ObjectId, new GridStore(this.gridStore.db, this.versions[k], "r", {root: this.gridStore.root}));
				(this.versions[k] as GridFSFile).folder = 'videoversions';
				// } else {
				// 	this.createVideoVersion(k);
			}
		});
	}

	checkVideoVersion(k: string, force: boolean) {
		if (this.versions && this.versions[k])
			return (this.versions[k] as GridFSFile).load();
		else
			return this.createVideoVersion(k, force);
	}

	getMetadata(): Promise<this> {
		if (this.metadata || ['videos', 'audios'].indexOf(this.folder!) === -1)
			return Promise.resolve(this.metadata);

		return this.tmpFile()
			.then((tmpfile: string) => multimedia(tmpfile))
			.then((r: any) => this.update({metadata: r}))
			// assignamos todos los valores de metadata al propio objeto (duration, fps, etc...)
			.then(() => Object.assign(this, this.metadata));
	}

	tmpFile() {
		const file = tmpdir + this._id + '_' + this.filename;

		return fsp.access(file)
			.then(() => file)
			.catch(() => {
				return new Promise((ok, ko) => {
					this.gridStore.open((err: Error, gs: any) => {
						if (err)
							return ko(err);

						gs.seek(0, () => {
							gs.read((err2: Error, data: any) => {
								if (err2)
									return ko(err2);

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

	createVideoVersion(k: string, force: boolean) {
		if (!this.processLog[k])
			this.processLog[k] = {};

		if (this.processLog[k].started) {
			const elapsed = Date.now() - this.processLog[k].started.getTime(),
				max = force ? 4 * 60000 : 4 * 60 * 60000;

			if (elapsed < max) {
				const err = new LipthusError(
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

				const id = new Types.ObjectId();
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
							.then((exists: boolean) => {
								if (!exists)
									return ko(new Error('tmp file not created: ' + newTmpFile));

								const gs = new GridStore(this.gridStore.db, id, filename, "w", {
									root: this.gridStore.root,
									content_type: 'video/' + k
								});

								gs.open((err2: Error, gs2: any) => {
									if (err2)
										return ko(err2);

									gs2.writeFile(newTmpFile, (err3: Error) => {
										if (err3)
											return ko(err3);

										debug('version ' + k + ' written into db: ' + id);

										if (!this.versions)
											this.versions = {};

										this.versions[k] = id;
										this.processLog[k].end = new Date();

										const update = {
											versions: <any>{},
											processLog: this.processLog
										};

										Object.keys(this.versions).forEach(i => {
											if (this.versions![i])
												update.versions[i] = (this.versions![i] as GridFSFile)._id || this.versions![i];
										});

										this.update(update)
											.then(() => this.collection())
											.then(collection =>
												multimedia(newTmpFile)
													.then((metadata: any) => {
														const params = {
															folder: 'videoversions',
															parent: this._id,
															metadata: metadata
														};

														collection.updateOne({_id: id}, {$set: params}, (err4: Error) => {
															if (err4)
																return ko(err4);

															fsp.unlink(tmpFile)
																.catch(console.error.bind(console));

															this.versions![k] = new GridFSFile(id, new GridStore(this.gridStore.db, id, "r", {root: this.gridStore.root}));

															if (videoExt.every(ext => {
																return !!this.versions![ext];
															})) {
																this.gridStore.db.emit('videoProcessed', this);
															}

															ok(this.versions![k]);
														});

														return fsp.unlink(newTmpFile);
													})
											)
											.catch(ko);
									});
								});
							});
					});
				});
			});
	}

	update(params: any) {
		return this.collection()
			.then(collection => collection.updateOne({_id: this._id}, {$set: params}))
			.then(() => Object.assign(this, params));
	}

	/**
	 * elimina un archivo
	 */
	unlink(): Promise<void> {
		if (this.folder === 'videos') {
			return this.load()
				.then(() => Promise.all(Object.keys(this.versions || {}).map(k => (this.versions![k] as GridFSFile).unlink()))
				// permite continuar si la versión no existe
					.catch(err => console.error('Trying to remove a video version... ' + err.message)))
				.then(() => this.gridStore.open())
				.then(gs => gs.unlink());
		}

		return this.gridStore.open()
			.then((gs: any) => gs.unlink());
	}

	collection(): Promise<Collection> {
		return new Promise((ok, ko) => {
			if (this._collection)
				return ok(this._collection);

			this.gridStore.collection((err: Error, c: Collection) => {
				if (err)
					return ko(err);

				ok(this._collection = c);
			});
		});
	}

	// alias
	remove() {
		return this.unlink();
	}

	basename(ext?: string) {
		let ret = path.basename(this.filename!, path.extname(this.filename!));

		if (ext)
			ret += '.' + ext;

		return ret;
	}

	sendThumb(req: LipthusRequest, res: LipthusResponse) {
		return this.getThumb()
			.then(thumb => {
				if (!thumb)
					return;

				return thumb.send(req, res);
			});
	}

	sendFrame(req: LipthusRequest, res: LipthusResponse, position: number, opt: any) {
		this.load()
			.then(() => this.getVideoFrame(position))
			.then(bdf => {
				const ref = {
					collection: this.gridStore.root + '.files',
					id: this._id,
					field: 'frame_' + position
				};

				return (BinDataFile.fromMongo(bdf, ref) as BinDataImage).send(req, res, opt);
			}, () => res.status(404).send('Not Found'));
	}

	getKey() {
		return this.uploadDate!.getTime().toString();
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
			ret = this.getVideoFrame();
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

	getVideoFrame(position?: number): Promise<BinDataImage> {
		return this.getMetadata()
			.then(() => {
				const duration = this.duration!;

				if (!position)
					position = duration / 10;
				else if (position > duration)
					throw new Error('Video length is ' + duration + ', lower than ' + position);

				return this.getVideoFrameByNumber(position * this.fps!);
			});
	}

	getVideoFrameByNumber(number: number): Promise<BinDataImage> {
		const Cache = this.gridStore.db.eucaDb.cache;
		const opt = {
			name: number + '_' + this.basename('jpg'),
			tag: 'videoframe',
			source: this._id
		};

		return Cache.findOne(opt)
			.then((cached: any) => {
				if (cached) {
					delete cached.expires;
					delete cached._id;
					delete cached.__v;

					return BinDataFile.fromMongo(cached);
				}

				return this.tmpFile()
					.then((tmpFile: any) => {
						const tmpFile2 = tmpdir + 'frame_' + number + '_' + this._id + '.jpg';
						const cmd = 'avconv -i "' + tmpFile + '" -f image2 -frames:v 1 -ss ' + ((number - 1) / this.fps!) + ' ' + tmpFile2;

						debug(cmd);

						return new Promise((ok, ko) => {
							exec(cmd, err => {
								if (err)
									return ko(err);

								fsp.exists(tmpFile2)
									.then((exists: boolean) => {
										if (!exists)
											return ko(new Error('tmp file not created ' + tmpFile2));

										optimage(tmpFile2)
											.then((buffer: Buffer) => {
												fsp.unlink(tmpFile2).catch(ko);

												const bdi = new BinDataImage({
													name: opt.name,
													contentType: 'image/jpeg',
													mtime: this.mTime(),
													uploadDate: new Date(),
													size: buffer.length,
													md5: md5(buffer),
													MongoBinData: new Types.Buffer(buffer).toObject(),
													width: this.metadata.width,
													height: this.metadata.height,
													tag: 'videoframe',
													source: this._id
												});

												return Cache.create(bdi).then(() => ok(bdi));
											})
											.catch(ko);
									});
							});
						});
					});
			});
	}

	_pdfThumb(): Promise<BinDataImage> {
		const tmpFile2 = tmpdir + 'thumb_' + this._id + '.png';

		return this.tmpFile()
			.then((tmpFile: any) => {
				return new Promise((ok, ko) => {
					const cmd = 'convert -thumbnail 150x150 -background white -alpha remove "' + tmpFile + '"[0] ' + tmpFile2;

					exec(cmd, err => {
						if (err)
							return ko(err);

						fsp.exists(tmpFile2)
							.then((exists: boolean) => {
								if (!exists)
									return ko(new Error('tmp file not created ' + tmpFile2));

								BinDataFile.fromFile({
									name: this.basename('png'),
									path: tmpFile2,
									contentType: 'image/png',
									width: 150,
									height: 150,
									mtime: this.mTime()
								})
									.then(ok)
									.catch(ko);
							});
					});
				});
			});
	}
}

class GridFSFileNotFoundError extends Error {

	public status = 404;

	constructor(msg: string) {
		super(msg);
	}
}
