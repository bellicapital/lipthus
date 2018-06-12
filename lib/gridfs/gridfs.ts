import {Types} from "mongoose";
import * as fs from "fs";
import * as util from "util";
import {Db} from "mongodb";
import {GridFSFile} from "./gridfs-file";

const GridStore = require('mongodb').GridStore;
const Mime = require('mime');

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
				
				const fields: {[s: string]: number} = {};
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
	
	fromFile(file: string | any) {
		return new Promise((ok, ko) => {
			if (typeof file === 'string') {
				const path = file;
				
				file = util.inspect(fs.statSync(file));
				
				file.path = path;
				file.type = Mime.lookup(path);
				file.fileName = (path as any).basename(path);
			} else if (!file.fileName)
				file.fileName = file.originalname;
			
			const id = new Types.ObjectId();
			
			const gs = new GridStore(this.db, id, file.fileName, "w", {root: this.ns, content_type: file.type || file.mimetype});
			
			gs.open((err: Error, gs2: any) => {
				if (err)
					return ko(err);
				
				gs2.writeFile(file.path, (err2: Error, doc: any) => {
					if (err2)
						return ko(err2);
					
					ok(doc);
				});
			});
		});
	}
}
