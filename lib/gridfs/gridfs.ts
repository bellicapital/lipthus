import {Types} from "mongoose";
import * as fs from "fs";
import {Db} from "mongodb";
import {GridFSFile} from "./gridfs-file";
import * as debug0 from "debug";

const debug = debug0('site:gridfs');
const path = require('path');
const request = require('request');
const Mime = require('mime');
const multimedia = require('multimedia-helper');
const {GridStore} = require('mongodb');

export class GridFS {

	public loaded = false;
	public err?: Error;

	constructor(public db: Db, public ns: string = GridStore.DEFAULT_ROOT_COLLECTION) {
		this.db = db;
		this.ns = ns || GridStore.DEFAULT_ROOT_COLLECTION;
	}

	get(id: string | Types.ObjectId) {
		if (typeof id === 'string')
			id = Types.ObjectId(id);

		return new GridFSFile(id, new GridStore(this.db, id, "r", {root: this.ns}));
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

					const id = new Types.ObjectId();
					const gs = new GridStore(this.db, id, file.fileName, "w", {root: this.ns, content_type: file.type});

					gs.open((err: Error, gs2: any) => {
						if (err)
							return ko(err);

						gs2.writeFile(file.path, (err2: Error, doc: any) => {
							if (err2)
								return ko(err2);

							this.get(doc.fileId).load()
								.then(gsFile => gsFile.update(fileOptions))
								.then(ok)
								.catch(ko);
						});
					});
				});
		});
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
