"use strict";

const fs = require('mz/fs');
const path = require('path');
const Mime = require('mime');
const md5 = require('md5');
const gm = require('gm').subClass({ imageMagick: true });//jj 23-9-15 con imageMagick es más estable
const Binary = require('mongoose').Types.Buffer.Binary;
const debug = require('debug')('site:bdf');


class BinDataFile {
	constructor(data, colRef) {
		this.weight = 0;

		data && Object.extend(this, data);

		if (colRef)
			this.setColRef(colRef);

		if (this.uploadDate && typeof this.uploadDate === 'string')
			this.uploadDate = new Date(this.uploadDate);

		if (this.mtime && typeof this.mtime === 'string')
			this.mtime = new Date(this.mtime);
	}

	setColRef(colRef) {
		Object.defineProperty(this, 'colRef', {
			get: () => colRef
		});
	}

	info() {
		const ret = new DbfInfo({
			name: this.name,
			contentType: this.contentType,
			path: this.getPath(),
			weight: this.weight,
			mtime: this.mtime,
			size: this.size
		});

		ret.uri = ret.path + this.uriName();

		return ret;
	}

	toJSON() {
		return this.info();
	}

	getPath() {
		return this.colRef ? '/bdf/' + this.colRef.collection + '/' + this.colRef.id + '/' + this.colRef.field + '/' : null;
	}

	getUri() {
		return this.colRef ? this.getPath() + this.uriName() : null;
	}

	uriName() {
		return encodeURIComponent(this.name.replace(/\s/g, ''));
	}

	formDataValue() {
		return this.name;
	}

	send(req, res) {
		if (!this.MongoBinData)
			return typeof cb === 'function' && cb(new Error('MongoBinData is empty'));

		let data = this.MongoBinData.buffer;

		this.contentType && res.type(this.contentType);

		res.set('Expires', new Date().addDays(60).toUTCString());

		if (this.mtime)
			res.set('Last-modified', this.mtime.toUTCString());

		res.send(data);
	}

	getKey() {
		if (!this.key)
			this.key = this.uploadDate.getTime().toString();

		return this.key;
	}

	toString() {
		return 'data:' + this.contentType + ';base64,' + this.MongoBinData.toString('base64');
	}

	static fromMongo(mongo, colRef) {
		if (!mongo)
			return mongo;

		if (mongo.toObject)
			mongo = mongo.toObject();

		return /^image\/.*$/.test(mongo.contentType)
			? new BinDataImage(mongo, colRef)
			: new BinDataFile(mongo, colRef);
	}

	static fromString(string, colRef) {
		const r = /data:(\w+\/\w+);([^,]+)(.+)$/.exec(string);

		if (!r)
			return;

		const ext = r[1].split('/')[1];
		const buffer = new Buffer(r[3], r[2]);
		const date = new Date();
		const obj = {
			contentType: r[1],
			size: string.length,
			md5: md5(buffer),
			uploadDate: date,
			mtime: date,
			name: 'str-' + date.getTime() + '.' + ext,
			MongoBinData: new Binary(buffer)
		};

		let ret;

		if (/^image\/.*$/.test(obj.contentType)) {
			ret = new BinDataImage(obj, colRef);
			ret.getDimentions();
		} else
			ret = new BinDataFile(obj, colRef);

		return ret;
	}

	static fromFile(p, opt = {}) {
		if (typeof p === 'string')
			p = {path: p};

		if(!p.mimetype)
			p.mimetype = p.type || Mime.lookup(p.name || p.path);

		return fs
			.readFile(p.path)
			.then(buffer => {
				p.buffer = buffer;

				if(p.mtime)
					return;

				// incrusta mtime si no se ha aportado desde el cliente
				return fs
					.stat(p.path)
					.then(stats => p.mtime = stats.mtime);
			})
			.then(() => ({
				name: p.name || p.originalname || path.basename(p.path),
				contentType: p.mimetype,
				mtime: p.mtime,
				uploadDate: new Date(),
				size: p.buffer.length,
				md5: md5(p.buffer),
				MongoBinData: new Binary(p.buffer)
			}))
			.then(obj => /^image\/.*$/.test(p.mimetype) ? new BinDataImage(obj).postFromFile(opt) : new BinDataFile(obj));
	}

	static fromBuffer(p, opt){
		const obj = {
			name: p.originalname,
			contentType: p.mimetype,
			mtime: p.mtime,
			uploadDate: new Date(),
			size: p.size || p.buffer.length,
			md5: md5(p.buffer),
			MongoBinData: new Binary(p.buffer)
		};

		return /^image\/.*$/.test(p.mimetype) ? new BinDataImage(obj).postFromFile(opt) : new BinDataFile(obj);
	}

	static fromData(img, width, height, colRef) {
		if (!/^data:(image\/\w+);base64,/.test(img))
			return new Error('wrong data');

		const contentType = /^data:(image\/\w+);base64,/.exec(img)[1];
		const data = img.replace(/^data:image\/\w+;base64,/, "");

		const bdf = new BinDataImage({
			name: "fromData_" + Date.now() + ".png",
			contentType: contentType,
			mtime: new Date(),
			uploadDate: new Date(),
			size: data.length,
			md5: md5(data),
			width: parseInt(width, 10),
			height: parseInt(height, 10),
			MongoBinData: new Binary(new Buffer(data, 'base64'))
		});

		colRef && Object.defineProperty(bdf, 'colRef', {value: colRef});

		return bdf;
	}

	static isBdf(o) {
		return !!o.MongoBinData;
	}
}

class DbfInfo{
	constructor(values){
		Object.keys(values).forEach(i => this[i] = values[i]);
	}
}

module.exports = BinDataFile;

const BinDataImage = require('./bdi');