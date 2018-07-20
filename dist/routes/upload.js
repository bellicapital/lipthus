"use strict";

const fs = require('fs');
const mongoose = require('mongoose');
const {BinDataFile} = require('../modules');
const debug = require('debug')('site:upload');

module.exports = function(req, res){
	new ReqFile(req)
		.process()
		.then(r => res.send(r))
		.catch(err => {
			req.logError(err);
			debug(err);
			res.send({error: err.message})
		});
};

class ReqFile {
	constructor(req) {
		this.req = req;
		this.params = req.body;
	}

	setItemParams(){
		this.itemid = mongoose.Types.ObjectId(this.params.itemid);
		this.query = {_id: this.itemid};
		this.collection = this.params.schema;
	}

	setSessionParams(){
		this.query = {key: this.params.schema + '_' + this.req.sessionID};
		this.collection = this.itemid ? this.params.schema : 'tmp';
	}

	check() {
		return new Promise((ok, ko) => {
			if (!this.params.schema || !this.params.itemid || !this.params.field)
				return ko(new Error('not all parameters received => schema: ' + this.params.schema + ', itemid: ' + this.params.itemid + ', field: ' + this.params.field));

			ok();
		});
	}

	process() {
		return this.check().then(this._process.bind(this));
	}

	/**
	 *
	 * @returns {Promise}
	 * @private
	 */
	_process() {
		return new Promise((ok, ko) => {
			this.field = this.params.field;
			this.file = this.req.files[0];
			this.schema = this.req.db.schemas[this.params.schema];

			if (!this.schema)
				return ko(new Error('schema ' + this.params.schema + ' does not exists'));

			this.file.mtime = this.params.mtime ? new Date(parseInt(this.params.mtime, 10) * 1000) : Date.now();

			if (!this.file.mimetype)
				this.file.mimetype = this.file.headers['content-type'];

			this.type = this.file.mimetype.split('/');
			this.isTemp = this.params.itemid === 'sessionform';

			if (!this.isTemp)
				this.setItemParams();
			else
				this.setSessionParams();

			this.model = this.req.db[this.collection];

			let func = this.type[0] === 'image' ? 'processImage' : 'processNonImage';

			return this[func]().then(ok, ko);
		});
	}

	processImage(){
		return new Promise((ok, ko) => {
			const opt = {
				maxwidth: this.req.site.config.imgmaxwidth,
				maxheight: this.req.site.config.imgmaxheight
			};

			BinDataFile.fromFile(this.file, opt)
				.then(bdf => {
					let key = bdf.getKey();
					let namespace = this.field;

					if (['BdfList', 'Fs'].indexOf(this.schemaTypeName()) !== -1)
						namespace += '.' + key;

					const options = {};

					let endImageUpload = () => {
						let update = {$set: {}};

						update.$set[namespace] = bdf;

						this.model.findOneAndUpdate(this.query, update, options)
							.then(obj => {
								bdf.colRef = {
									collection: this.collection,
									id: obj._id || obj.value._id,
									field: namespace
								};

								if (this.itemid)
									this.logUpdate(namespace, bdf);

								const ret = bdf.info();

								ret.key = key;

								fs.existsSync(this.file.path) && fs.unlinkSync(this.file.path);

								ok(ret);
							})
							.catch(ko);
					};

					if (this.isTemp) {
						namespace = 'value.' + namespace;

						options.upsert = true;

						endImageUpload();
					} else {
						this.model.findOne(this.query, this.field)
							.then(obj => {
								if (obj[this.field])
									bdf.weight = Object.keys(obj[this.field]).length + 1;

								endImageUpload();
							})
							.catch(ko);
					}
				})
				.catch(ko);
		});
	}

	processNonImage(){
		const fileOptions = {
			submitter: this.req.user ? {
				uid: this.req.user._id,
				uname: this.req.user.uname
			} : null,
			items: [{
				$ref: this.collection,
				$id: this.itemid,
				field: this.field
			}]
		};

		let gsFile;
		let namespace;

		return this.req.db.fs.fromFile(this.file, fileOptions)
			.then(gFile => this.req.db.fs.get(gFile.fileId).load())
			.then(colFile => gsFile = colFile)

			// reference to item
			.then(() => {
				const update = {$set: {}};

				namespace = this.field + '.' + gsFile.getKey();

				update.$set[namespace] = gsFile._id;

				return this.model.findOneAndUpdate(this.query, update);
			})
			.then(() => {
				if (this.itemid)
					this.logUpdate(namespace, gsFile._id);

				return gsFile.info();
			});
	}

	/**
	 * @returns {string}
	 */
	schemaTypeName(){
		return this.schema.paths[this.params.field].constructor.name;
		// let schemaType = ReqFile.objectVal(this.schema.tree, this.params.field);
		//
		// return schemaType && schemaType.type && schemaType.type.name;
	}

	logUpdate(name, value) {
		const logUpdates = this.schema.options.logUpdates;

		if (logUpdates && (logUpdates === true || logUpdates.indexOf(name.replace(/\..+$/, '')) !== -1))
			this.req.logger.logUpdate(this.params.schema, this.itemid, name, value);
	}

	static objectVal(obj, field){
		if(typeof field === 'string')
			field = field.split('.');

		if(field.length === 1 || obj[field[0]] === undefined)
			return obj[field[0]];

		const first = field.shift();

		return ReqFile.objectVal(obj[first], field);
	}
}
