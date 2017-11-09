"use strict";

const Image = require('./image');
const gm = require('gm').subClass({ imageMagick: true });//jj 23-9-15 con imageMagick es más estable
const BinDataFile = require('./bdf');
const path = require('path');
const md5 = require('md5');
const Binary = require('mongoose').Types.Buffer.Binary;
const debug = require('debug')('site:bdi');


class BinDataImage extends BinDataFile {
	constructor(data, colRef) {
		super(data, colRef);
	}

	info(width, height, crop, enlarge, nwm) {
		const ret = new DbfImageInfo({
			name: this.name,
			contentType: this.contentType,
			naturalWidth: this.width,
			naturalHeight: this.height,
			width: this.width,
			height: this.height,
			path: this.getPath(),
			weight: this.weight,
			size: this.size,
			mtime: this.mtime,
			md5: this.md5,
			key: this.getKey()
		});

		if (width) {
			if (!height)
			{ //noinspection JSSuspiciousNameCombination
				height = width;
			}

			if (enlarge) {
				ret.width = width;
				ret.height = height;
			} else
				Object.extend(ret, Image.fitCalc(this.width, this.height, width, height, crop));
		}

		let params_fragment = ret.width + 'x' + ret.height;

		if (crop)
			params_fragment += 'k1';

		if (nwm)
			params_fragment += 'm' + this.md5;

		ret.uri = ret.path + params_fragment + '/' + this.uriName();

		return ret;
	}

	toJSON() {
		const ret = super.info();

		ret.width = this.width;
		ret.height = this.height;

		return ret;
	}

	getDimentions() {
		if (!this.width) {
			if (this.contentType === 'image/png') {
				this.width = this.MongoBinData.buffer.readUInt32BE(16);
				this.height = this.MongoBinData.buffer.readUInt32BE(20);
			}
		}

		return {
			width: this.width,
			height: this.height
		};
	}

	getThumb(width, height, crop, enlarge) {
		return this.info().getThumb(width, height, crop, enlarge);
	}

	getCached(db, opt) {
		const Cache = db.cache;

		if (this.md5)
			opt.srcmd5 = this.md5;

		if (!opt['ref.id'] && this.colRef)
			Object.keys(this.colRef).forEach(i => opt['ref.' + i] = this.colRef[i]);

		const cacheOpt = {};

		Object.extend(cacheOpt, opt);

		cacheOpt.contentType = 'image/' + (opt.format || 'jpg');
		delete cacheOpt.format;

		if (cacheOpt.wm)
			cacheOpt.wm = true;

		if (!cacheOpt.width)
			cacheOpt.width = {$exists: false};

		return Cache
			.findOne(cacheOpt)
			.then(cached => {
				if (cached)
					return BinDataFile.fromMongo(cached);

				return this.toBuffer(opt)
					.then(buffer => new Cache(Object.extend({
							name: this.name,
							contentType: cacheOpt.contentType,
							mtime: this.mtime || new Date(),
							tag: 'image',
							MongoBinData: new Binary(buffer),
							ref: this.colRef,
							srcmd5: this.md5
						}, opt))
					)
					.then(cached => cached.save())
					.then(cached => BinDataFile.fromMongo(cached));
			});

	}

	toBuffer(opt) {
		return new Promise((ok, ko) => {
			let gmi = gm(this.MongoBinData.buffer, this.contentType.replace('/', '.'))
				.quality(70)
				.strip()
				.autoOrient();

			if (opt.width) {
				gmi.coalesce().resize(opt.width, opt.height, opt.crop && '^');

				if (opt.crop)
					gmi.gravity('Center').crop(opt.width, opt.height);
			}

			if(opt.format)
				gmi.setFormat(opt.format);

			gmi.toBuffer((err, buffer) => {
				if(err)
					return ko(err);

				if (!buffer || !opt.wm)
					return ok(buffer);

				// todo: opacity
				if (opt.wm.type === 1)//text watermark. TODO.
					return ok(buffer);

				if (opt.wm.type === 2) {
					gmi = gm(buffer, this.name)
						.command('composite')
						.gravity(opt.wm.gravity || 'Center')
						.strip()
						.in(opt.wm.image);

					if (opt.wm.geometry)
						gmi.geometry(opt.wm.geometry);

					gmi.toBuffer((err, buffer) => err ? ko(err) : ok(buffer));
				}
			});
		});
	}

	send(req, res, opt) {
		if (!opt)
			return super.send(req, res);
		else
			return this.getCached(req.site.db, opt)
				.then(cached => cached.send(req, res))
				.catch(req.next);
	}
	
	postFromFile(opt){
		return new Promise((ok, ko) => {
			const gmi = gm(this.MongoBinData.buffer)
				.strip();

			gmi.identify((err, ft) => {
				if (err) {
					if (err.code === 'ENOENT')
						err.message += '\nis graphicsmagick installed?\nhttps://github.com/aheckmann/gm';

					return ko(err);
				}

				this.width = ft.size.width;
				this.height = ft.size.height;

				opt = opt || {};

				if (opt.noResize || this.contentType.match(/(gif|svg)/i))
					return ok(this);

				gmi.autoOrient();

				opt.maxwidth = opt.maxwidth || 960;
				opt.maxheight = opt.maxheight || 960;

				if (this.width > opt.maxwidth || this.height > opt.maxheight) {
					const s = Math.min(opt.maxwidth / this.width, opt.maxheight / this.height);

					this.width = parseInt(s * this.width);
					this.height = parseInt(s * this.height);

					debug('resize image');

					gmi.resize(this.width, this.height);
				}

				gmi.toBuffer((err, buffer) => {
					if (err)
						return ko(err);

					this.MongoBinData = new Binary(buffer);
					this.size = buffer.length;

					ok(this);
				});
			});
		});
	}


	// noinspection JSUnusedGlobalSymbols
	/**
	 *
	 * @param params {{
	 *      data: string (raw image data),
	 *      name: string,
	 *      [lastModified]: Date,
	 *      [size]: number,
	 *      [contentType]: string
	 *      weight?: number
	 * }}
	 * @param colRef
	 * @returns {Promise.<BinDataImage>}
	 */
	static fromFrontEnd (params, colRef) {
		const r = /data:(\w+\/\w+);([^,]+)(.+)$/.exec(params.data);

		if (!r)
			return;

		const ext = r[1].split('/')[1];
		const buffer = new Buffer(r[3], r[2]);
		const obj = {
			contentType: r[1],
			size: buffer.length,
			md5: md5(buffer),
			uploadDate: new Date(),
			mtime: params.lastModified || new Date(),
			name: params.name || 'str-' + date.getTime() + '.' + ext,
			MongoBinData: new Binary(buffer),
			weight: params.weight
		};

		if(params.size && params.size !== obj.size)
			debug('params.size "' + params.size + '" do not match width data "' + obj.size + '"');

		if(params.contentType && params.contentType !== obj.contentType)
			debug('params.contentType "' + params.contentType + '" do not match width data "' + obj.contentType + '"');

		return new BinDataImage(obj, colRef).postFromFile();
	}
}

class DbfInfo{
	constructor(values){
		Object.keys(values).forEach(i => this[i] = values[i]);
	}
}

class DbfImageInfo extends DbfInfo{
	constructor(values){
		super(values);
	}

	// noinspection JSUnusedLocalSymbols
	getThumb(width, height, crop, nwm, enlarge, ext = '.jpg') {
		let ret = {
			uri: this.path,
			name: this.uriName(ext),
			width: this.width,
			height: this.height,
			originalWidth: this.width,
			originalHeight: this.height
		};

		if(width) {
			if (!crop) {
				const fc = Image.fitCalc(this.width, this.height, width, height, crop);

				ret.width = fc.width;
				ret.height = fc.height;
			} else {
				ret.width = width;
				ret.height = height;
			}

			ret.uri += ret.width + 'x' + ret.height;

			if (crop)
				ret.uri += 'k1';

			ret.uri += '/';
		}

		if (nwm)
			ret.uri += 'm' + this.md5;

		ret.uri += ret.name;
		ret.originalUri = this.path + ret.name;

		return  new DbfThumb(ret);
	}

	uriName(ext) {
		const curext = path.extname(this.name);
		const bn = path.basename(this.name, curext);

		return encodeURIComponent(bn.replace(/\s/g, '')) + (ext || curext);
	}
}

class DbfThumb {
	constructor(values){
		Object.extend(this, values);
	}

	toHtml(){
		return '<a href="' + this.originalUri + '"><img src="' + this.uri + '" alt="' + this.name + '"/></a>';
	}
}

module.exports = BinDataImage;