"use strict";

const fs = require('mz/fs');
const path = require('path');
const Mime = require('mime');
const md5 = require('md5');
const Binary = require('mongoose').Types.Buffer.Binary;
const request = require('request');


export class BinDataFile {
	public weight = 0;
	public uploadDate: Date;
	public mtime: Date;
	public name: string;
	public contentType: string;
	public size: number;
	public colRef: any;
	public MongoBinData: any;
	public key: string;
	public md5: string;
	
	constructor(data: any, colRef?: any) {
		if (data)
			Object.extend(this, data);
		
		if (colRef)
			this.setColRef(colRef);
		
		if (data.uploadDate && typeof data.uploadDate === 'string')
			this.uploadDate = new Date(data.uploadDate);
		
		if (data.mtime && typeof data.mtime === 'string')
			this.mtime = new Date(data.mtime);
	}
	
	setColRef(colRef: any) {
		if (colRef)
			Object.defineProperty(this, 'colRef', {value: colRef});
	}
	
	info() {
		const ret: any = new DbfInfo({
			name: this.name,
			contentType: this.contentType,
			uploadDate: this.uploadDate,
			path: this.getPath(),
			weight: this.weight,
			mtime: this.mtime,
			size: this.size,
			key: this.getKey()
		});
		
		ret.uri = ret.path + this.uriName();
		
		return ret;
	}
	
	//noinspection JSUnusedGlobalSymbols
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
	
	send(req: any, res: any) {
		if (!this.MongoBinData)
			return Promise.reject(new Error('MongoBinData is empty'));
		
		const data = this.MongoBinData.buffer;
		
		if (this.contentType)
			res.type(this.contentType);
		
		res.set('Expires', new Date().addDays(60).toUTCString());
		
		if (this.mtime)
			res.set('Last-modified', this.mtime.toUTCString());
		
		return res.send(data);
	}
	
	getKey() {
		if (!this.key)
			this.key = this.uploadDate.getTime().toString();
		
		return this.key;
	}
	
	toString() {
		return 'data:' + this.contentType + ';base64,' + this.MongoBinData.toString('base64');
	}
	
	static fromMongo(mongo: any, colRef?: any) {
		if (!mongo)
			return mongo;
		
		if (mongo.toObject)
			mongo = mongo.toObject();
		
		return /^image\/.*$/.test(mongo.contentType)
			? new BinDataImage(mongo, colRef)
			: new BinDataFile(mongo, colRef);
	}
	
	static fromString(str: string, colRef: any, datetime = new Date()) {
		const r = /data:(\w+\/\w+);([^,]+)(.+)$/.exec(str);
		
		if (!r)
			return;
		
		const ext = r[1].split('/')[1];
		const buffer = new Buffer(r[3], r[2]);
		const obj = {
			contentType: r[1],
			size: buffer.length,
			md5: md5(buffer),
			uploadDate: datetime,
			mtime: datetime,
			name: 'str-' + datetime.getTime() + '.' + ext,
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
	
	/**
	 *
	 * @param p
	 * @param opt
	 *
	 * @return Promise<BinDataFile>
	 */
	static fromFile(p: string | any, opt = {}) {
		if (typeof p === 'string')
			p = {path: p};
		
		if (!p.mimetype)
			p.mimetype = p.type || Mime.getType(p.name || p.path);
		
		return fs
			.readFile(p.path)
			.then((buffer: Buffer) => {
				p.buffer = buffer;
				
				if (p.mtime)
					return;
				
				// incrusta mtime si no se ha aportado desde el cliente
				return fs
					.stat(p.path)
					.then((stats: any) => p.mtime = stats.mtime);
			})
			.then(() => BinDataFile.fromBuffer({
				originalname: p.name || p.originalname || path.basename(p.path),
				mimetype: p.mimetype,
				mtime: p.mtime,
				buffer: p.buffer
			}, opt));
	}
	
	// noinspection JSUnusedGlobalSymbols
	static fromUrl(url: string) {
		return new Promise((ok, ko) => {
			request({url: url, encoding: null}, (err: Error, res: any, body: any) => {
				if (err)
					return ko(err);
				
				ok(BinDataFile.fromBuffer({
					originalname: path.basename(url),
					mimetype: res.headers['content-type'],
					mtime: new Date(),
					buffer: body
				}));
			});
		});
	}
	
	static fromBuffer(p: any, opt?: any) {
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
	
	//noinspection JSUnusedGlobalSymbols
	/**
	 * Use Bdf.fromString
	 *
	 * @deprecated
	 * @param img
	 * @param width
	 * @param height
	 * @param colRef
	 * @param datetime
	 * @returns {*}
	 */
	static fromData(img: string, width: number, height: number, colRef: any, datetime = new Date()) {
		console.warn('@deprecated', 'Bdf.fromData');
		
		if (!/^data:(image\/\w+);base64,/.test(img))
			return new Error('wrong data');
		
		const isImageResult = /^data:(image\/\w+);base64,/.exec(img);
		const contentType = isImageResult && isImageResult[1];
		const data = img.replace(/^data:image\/\w+;base64,/, "");

		return new BinDataImage({
			name: "fromData_" + Date.now() + ".png",
			contentType: contentType,
			mtime: datetime,
			uploadDate: datetime,
			size: data.length,
			md5: md5(data),
			width: width,
			height: height,
			MongoBinData: new Binary(new Buffer(data, 'base64'))
		}, colRef);
	}
	
	//noinspection JSUnusedGlobalSymbols
	static isBdf(o: any) {
		return !!o.MongoBinData;
	}
}

export interface DbfInfoParams {
	path: string | null;
	name: string;
	md5?: string;
	contentType: string;
	uploadDate?: Date;
	weight: number;
	mtime: Date;
	size: number;
	key: string;
}

export class DbfInfo implements DbfInfoParams {
	
	path: string | null;
	name: string;
	md5?: string;
	contentType: string;
	uploadDate?: Date;
	weight: number;
	mtime: Date;
	size: number;
	key: string;
	
	constructor(p: DbfInfoParams) {
		this.path = p.path;
		this.name = p.name;
		this.md5 = p.md5;
		this.contentType = p.contentType;
		this.uploadDate = p.uploadDate;
		this.weight = p.weight;
		this.mtime = p.mtime;
		this.size = p.size;
		this.key = p.key;
	}
}

import {BinDataImage} from './bdi';

export default BinDataFile;
