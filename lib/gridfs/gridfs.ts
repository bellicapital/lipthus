import {Types} from "mongoose";
import * as fs from "fs";
import {Db, GridFSBucket} from "mongodb";
import {GridFSFile} from "./gridfs-file";
import * as debug0 from "debug";

const debug = debug0('site:gridfs');
const path = require('path');
const request = require('request');
const Mime = require('mime');
const multimedia = require('multimedia-helper');


export class GridFS {

	public loaded = false;
	public err?: Error;

	constructor(public db: Db, public ns: string = 'fs') {
		this.db = db;
	}

	get(id: string | Types.ObjectId) {
		if (typeof id === 'string')
			id = Types.ObjectId(id);

		return new GridFSFile(id, (this.db as any).lipthusDb);
	}

	findById(id: string) {
		return this.get(id).load();
	}

	collection(cb: any) {
		this.db.collection(this.ns + '.files', cb);
	}

	find() {
		const args = arguments;

		this.collection((err: Error, collection: any) => {
			if (err)
				return args[args.length - 1]();

			collection.find.apply(collection, args);
		});
	}

	findOneField(id: string, field: string) {
		return new Promise((ok, ko) => {
			if (this.loaded)
				return ok((this as any)[field]);

			this.collection((err: Error, collection: any) => {
				if (err)
					return ko(err);

				const fields: { [s: string]: number } = {};
				fields[field] = 1;

				collection.findOne({_id: Types.ObjectId(id)}, fields, (err2: Error, obj: any) => {
					this.err = err2;

					if (err2) return ko(err2);
					if (!obj) return ok();

					ok(obj[field]);
				});
			});
		});
	}

	fromFile(file: string | any, fileOptions: any = {}): Promise<any/*GridStore*/> {
		return new Promise((ok, ko) => {
			if (typeof file === 'string') {
				const filePath = file;

				file = fs.statSync(file);

				file.path = filePath;
				file.type = Mime.getType(filePath);
				file.fileName = path.basename(filePath);
			} else {
				if (!file.fileName)
					file.fileName = file.originalname;

				file.type = file.type || file.mimetype;
			}

			if (!fileOptions.uploadDate)
				fileOptions.uploadDate = new Date();

			GridFS.getMultimedia(file.path)
				.then(metadata => {
					if (metadata) {
						delete metadata.title;
						file.type = metadata.contentType;
						fileOptions.metadata = metadata;
						Object.assign(fileOptions, metadata);
					}

					const type = file.type.split('/');

					switch (type[0]) {
						case 'video':
							fileOptions.folder = 'videos';
							break;
						case 'audio':
							fileOptions.folder = 'audios';
							break;
						default:
							return;
					}

					const bucket = this.getBucket();

					fs.createReadStream(file.path)
						.pipe(bucket.openUploadStream(file.fileName))
						.on('error', ko)
						.on('finish', (result: {
							_id: Types.ObjectId;
							length: number;
							chunkSize: number;
							uploadDate: Date;
							filename: string;
							md5: string;
						}) => {
							this.get(result._id).load()
								.then(gsFile => gsFile.update(fileOptions))
								.then(ok, ko);
						});
				});
		});
	}

	getBucket() {
		return new GridFSBucket(this.db, {bucketName: this.ns});
	}

	/** Deletes a file with the given id
	 *
	 * @param id
	 */
	deleteOne(id: Types.ObjectId) {
		return this.getBucket().delete(id);
	}

	fromUrl(url: string, fileOptions: any = {}) {
		const fn = path.basename(url);
		const tmp = '/tmp/' + fn;

		debug('Fetching ' + url);

		return new Promise((ok, ko) => {
			request
				.get(url)
				.on('end', () => this.fromFile(tmp, fileOptions).then(ok, ko))
				.on('error', ko)
				.pipe(fs.createWriteStream(tmp));
		});
	}

	static getMultimedia(filePath: string): Promise<any> {
		return multimedia(filePath)
			.catch((err: Error) => debug(err));
	}
}
