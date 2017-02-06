"use strict";

const mongoose = require('mongoose');
const GridStore = mongoose.mongo.GridStore;
const fs = require('fs');
const Mime = require('mime');
const GridFSFile = require('./gridfs-file');

class GridFS
{
	constructor(db, ns) {
		this.db = db;
		this.ns = ns || GridStore.DEFAULT_ROOT_COLLECTION;
	}

	get(id) {
		if (typeof id === 'string')
			id = mongoose.Types.ObjectId(id);

		return new GridFSFile(id, new GridStore(this.db, id, "r", {root: this.ns}));
	}

	findById(id, cb) {
		return new Promise((ok, ko) => {
			this.get(id, (err, gfsf) => {
				if (err)
					return ko(err);

				gfsf.load(err => err ? ko(err) : ok(gfsf));
			});
		});
	}

	collection(cb) {
		this.db.collection(this.ns + '.files', cb);
	}

	find() {
		const args = arguments;

		this.collection(function (err, collection) {
			if (err)
				return args[args.length - 1]();

			collection.find.apply(collection, args);
		});
	}

	findOneField(id, field) {
		return new Promise((ok, ko) => {
			if (this.loaded)
				return ok(this[field]);

			this.collection((err, collection) => {
				if (err)
					return ko(err);

				const fields = {};
				fields[field] = 1;

				collection.findOne({_id: mongoose.Types.ObjectId(id)}, fields, (err, obj) => {
					this.err = err;

					if (err) return ko(err);
					if(!obj) return ok();

					ok(obj[field]);
				});
			});
		});
	}

	fromFile(file) {
		return new Promise((ok, ko) => {
			if (typeof file === 'string') {
				const path = file;

				file = util.inspect(fs.statSync(file));

				file.path = path;
				file.type = Mime.lookup(path);
				file.fileName = path.basename(path);
			} else if (!file.fileName)
				file.fileName = file.originalname;

			const id = new mongoose.Types.ObjectId();

			const gs = new GridStore(this.db, id, file.fileName, "w", {root: this.ns, content_type: file.type});

			gs.open(function (err, gs) {
				if (err)
					return ko(err);

				gs.writeFile(file.path, (err, doc) => {
					if (err)
						return ko(err);

					ok(doc);
				});
			});
		});
	}
}

module.exports = GridFS;