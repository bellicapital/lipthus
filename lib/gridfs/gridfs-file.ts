import {FileInfo} from "./file-info";
import {Types} from "mongoose";
import * as path from "path";
import {exec} from "child_process";
import {BinDataFile, BinDataImage, LipthusDb} from "../../modules";
import * as md5 from "md5";
import * as debug0 from "debug";
import {LipthusRequest, LipthusResponse} from "../../index";
import {LipthusError} from "../../classes/lipthus-error";
import {optimage} from "../optimage";
import {Collection, GridFSBucket} from "mongodb";
import * as fs from "fs";
import {promisify} from "util";
import {expressMongoStream, MongoFileParams} from 'express-mongo-stream';
import {Response} from "express";
import {LipthusFile} from "../file-stream";

const multimedia = require('multimedia-helper');
const fsp = require('mz/fs');
const debug = debug0('site:gridfs-file');
const pExec = promisify(exec);
const cacheDir = '/var/cache/video-versions/';

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
	public metadata?: any;
	public thumb?: any;
	public versions?: { [s: string]: any };
	public md5?: string;
	public submitter?: string;
	public loaded = false;
	public error?: GridFSFileNotFoundError;
	public duration?: number;
	private processLog: any = {};
	private fps?: number;

	constructor(public _id: string | Types.ObjectId, public db: LipthusDb) {
	}

	static get videoExt() {
		return videoExt;
	}

	get id(): Types.ObjectId {
		return <Types.ObjectId>this._id;
	}

	getBucket(): GridFSBucket {
		return this.db.fs.getBucket();
	}

	mTime(): Date {
		if (this.mtime && this.mtime.getTime() !== 0)
			return this.mtime;

		if (!this.uploadDate)
			this.uploadDate = new Date();

		return this.uploadDate;
	}

	get databaseName(): string {
		return this.db.name;
	}

	get namespace(): string {
		return this.db.fs.ns;
	}

	get collection(): Collection {
		return this.db.collection(this.namespace);
	}

	info(full: boolean = false): FileInfo {
		const ret = new FileInfo({
			id: this._id + '',
			uri: '/' + this.namespace + '/' + this._id,
			db: this.databaseName
		});

		if (this.filename) { // loaded
			ret.uri += '/' + this.filename;
			ret.name = this.filename;
			ret.basename = this.basename();
			ret.size = this.length;
			ret.key = this.getKey();
			ret.lastModifiedDate = this.mTime();
			ret.contentType = this.contentType;

			if (this.error)
				ret.error = this.error;

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
			else if (!this.error && !this.contentType.indexOf('video'))
				ret.error = new Error('video conversion error');

			if (this.thumb && this.thumb.uploadDate)
				ret.thumbTS = this.thumb.uploadDate.getTime();

			if (full) {
				ret.folder = this.folder;
				ret.md5 = this.md5;
				ret.submitter = this.submitter || undefined;
			}
		} else if (this.loaded)
			ret.error = this.error;

		return ret;
	}

	send(req: LipthusRequest, res: LipthusResponse): Promise<any | Response> {
		return this.load()
			.then(() => {
				if (!this.contentType)
					throw 404;

				const params: MongoFileParams = {
					id: this.id,
					contentType: this.contentType,
					length: this.length,
					mtime: this.mTime(),
					disposition: req.query.dl ? 'attachment' : 'inline',
					duration: this.metadata && this.metadata.duration
				};

				return expressMongoStream(params, this.db._conn.db, req, res);
			})
			.catch((err: LipthusError) => {
				if (err.message === 'File does not exist')
					err.status = 404;

				return Promise.reject(err);
			});
	}

	toString() {
		let ret = '/' + this.namespace + '/' + this._id;

		if (this.loaded)
			ret += '/' + this.filename;

		return ret;
	}

	load(): Promise<GridFSFile> {
		if (this.loaded)
			return Promise.resolve(this);

		this.loaded = true;

		if (!this._id)
			return Promise.reject(new Error('No id!'));

		return this.getBucket().find({_id: this._id}).toArray()
			.then((r: Array<any>): any => {
				if (!r.length)
					return this.setNotFound();

				const obj = r[0];

				Object.keys(obj).forEach(i => (this as any)[i] = obj[i]);

				if (this.thumb)
					this.thumb = BinDataFile.fromMongo(this.thumb, {
						collection: this.namespace + '.files',
						id: this._id,
						field: 'thumb',
						db: this.databaseName
					});

				return this.getMetadata();
			})
			.then(() => this);
	}

	setNotFound() {
		this.error = new GridFSFileNotFoundError('File not found ' + this._id);
	}

	getVideoVersion(k: string, force: boolean): Promise<GridFSFile | any> {
		if (videoExt.indexOf(k) === -1)
			return Promise.reject(new Error('Version ' + k + ' not implemented'));

		return this.load()
			.then(() => {
				if (this.folder !== 'videos')
					throw new Error(this._id + ' is not a video main file');

				const fileName = this.videoVersionFileName(k);

				if (fs.existsSync(fileName))
					return new LipthusFile(fileName, this.versions[k]);

				return this.checkVideoVersion(k, force);
			});
	}

	videoVersionFileName(k: string) {
		return cacheDir + this.db.name + '/' + this._id + '.' + k;
	}

	checkVideoVersion(k: string, force: boolean) {
		const fileName = this.videoVersionFileName(k);

		if (fs.existsSync(fileName))
			return new LipthusFile(fileName, this.versions[k]);
		else
			return this.createVideoVersion(k, force);
	}

	getMetadata(): Promise<this> {
		if (this.metadata || ['videos', 'audios'].indexOf(this.folder!) === -1)
			return Promise.resolve(this.metadata);

		return this.tmpFile()
			.then(multimedia)
			.then((r: any) => this.update({metadata: r}))
			// asignamos todos los valores de metadata al propio objeto (duration, fps, etc...)
			.then(() => Object.assign(this, this.metadata));
	}

	tmpFile(): Promise<string> {
		return new Promise((ok, ko) => {
			const file = tmpdir + this._id + '_' + this.filename;

			if (fs.existsSync(file))
				return ok(file);

			this.getBucket().openDownloadStream(this.id)
				.pipe(fs.createWriteStream(file))
				.on('error', ko)
				.on('end', () => {
					debug('tmp file created: ' + file);
					ok(file);
				});
		});
	}

	createVideoVersion(k: string, force: boolean): Promise<any> {
		if (!this.processLog[k])
			this.processLog[k] = {};

		if (this.processLog[k].started) {
			const elapsed = Date.now() - this.processLog[k].started.getTime(),
				max = force ? 60000 : 4 * 60 * 60000;

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

		const dir = cacheDir + this.db.name;

		if (!fs.existsSync(dir))
			fs.mkdirSync(dir, {recursive: true});

		const fileName = dir + '/' + this._id + '.' + k;

		return this.update({processLog: this.processLog})
			.then(() => this.tmpFile())
			.then((tmpFile: string) => {
				let cmd = 'ffmpeg -i "' + tmpFile + '" -y -loglevel error -b:v 1M';

				if (this.metadata.width % 2 || this.metadata.height % 2)
					cmd += ' -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2"';

				cmd += ' -c:v ' + (k === 'mp4' ? 'libx264' : 'libvpx');

				if (this.metadata.audioChannels)
					cmd += ' -b:a 64k' + (k === 'webm' ? ' -c:a libvorbis' : ' -strict experimental');
				else
					cmd += ' -an';

				cmd += ' "' + fileName + '"';

				this.processLog[k].command = cmd;

				debug('executing cmd: ' + cmd);

				return this.update({processLog: this.processLog})
					.then(() => pExec(cmd))
					.then((r: any) => {
						this.processLog[k].result = r || 'ok';
						this.update({processLog: this.processLog}).catch(console.error.bind(console));

						if (!fs.existsSync(fileName))
							throw new Error('tmp file not created: ' + fileName);

						return multimedia(fileName)
							.then((metadata: any) => {
								this.processLog[k].end = new Date();

								debug("Version " + k + " created.");
								this.db.emit('videoProcessed', this);

								const update = {processLog: this.processLog};
								update['versions.' + k] = metadata;

								return this.update(update)
									.then(() => fsp.unlink(tmpFile));
							});
					});
			})
			.then((): any => new LipthusFile(fileName, this.versions[k]));
	}

	update(params: any): Promise<GridFSFile> {
		return this.db.fsfiles.updateOne({_id: this._id}, {$set: params}).exec()
			.then(() => Object.assign(this, params))
			.then(() => this as GridFSFile);
	}

	/**
	 * elimina un archivo
	 */
	unlink(): Promise<void> {
		if (this.folder !== 'videos')
			return this._unlink();

		return this.load()
			.then(() =>
				Object.keys(this.versions || {}).reduce((p, k) => p.then(() =>
						(this.versions![k] as GridFSFile)._unlink()
						// continue if the version does not exists
							.catch(err => console.error(err)))
					, Promise.resolve())
			)
			.then(() => this._unlink());
	}

	private _unlink(): Promise<void> {
		return new Promise((ok, ko) => {
			this.getBucket().delete(this.id, (err) => {
				if (err)
					ko(err);
				else
					ok();
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

	sendThumb(req: LipthusRequest, res: LipthusResponse, opt?: any) {
		return this.getThumb()
			.then(thumb => {
				if (!thumb)
					return;

				return thumb.send(req, res, opt);
			});
	}

	sendFrame(req: LipthusRequest, res: LipthusResponse, position: number, opt: any) {
		this.load()
			.then(() => this.getVideoFrame(position))
			.then(bdf => {
				const ref = {
					collection: this.namespace + '.files',
					id: this._id,
					field: 'frame_' + position
				};

				return (BinDataFile.fromMongo(bdf, ref) as BinDataImage).send(req, res, opt);
			}, () => res.status(404).send('Not Found'));
	}

	getKey() {
		return this.mTime().getTime().toString();
	}

	getThumb(): Promise<BinDataImage> {
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
		let ret: any;

		if (this.contentType.indexOf('video') === 0)
			ret = this.getVideoFrame();
		else if (this.contentType === 'application/pdf')
			ret = this._pdfThumb();
		else
			return Promise.reject(new Error('Can\'t create a thumb of ' + this.filename));

		return ret.then((bdf: any) => {
			if (bdf) {
				bdf.setColRef({
					collection: this.namespace + '.files',
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
		const Cache = this.db.cache;
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
						const cmd = 'ffmpeg -i "' + tmpFile + '" -f image2 -frames:v 1 -ss ' + ((number - 1) / this.fps!) + ' ' + tmpFile2;

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

												const now = new Date();
												const bdi = new BinDataImage({
													name: opt.name,
													contentType: 'image/jpeg',
													key: now.getTime().toString(),
													mtime: now,
													uploadDate: now,
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

	_pdfThumb(): Promise<BinDataImage | any> {
		const tmpFile2 = tmpdir + 'thumb_' + this._id + '.png';

		return this.tmpFile()
			.then(tmpFile => {
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
