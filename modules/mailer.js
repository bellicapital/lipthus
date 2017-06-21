"use strict";

const nodemailer = require('nodemailer');
const sesTransport = require('nodemailer-ses-transport');
const path = require('path');

class Mailer {
	constructor(conf, site) {
		conf = conf || {};

		if (conf.sesTransport) {
			process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
			conf = sesTransport(conf.sesTransport);
		}

		this.transport = nodemailer.createTransport(conf);
		Object.defineProperty(this, 'site', {value: site});
	}

	send(opt) {
		this.checkOptions(opt);

		return this.transport.sendMail(opt);
	}

	checkOptions(opt) {
		this.ensureForceEmbeddedImages(opt);
		this.ensureFrom(opt);
	}

	ensureFrom(opt) {
		if (!opt.from)
			opt.from = this.site + " <server@" + this.site.domainName + ">";
	}

	ensureForceEmbeddedImages(opt) {
		if (opt.forceEmbeddedImages === undefined)
			opt.forceEmbeddedImages = true;

		if (!opt.forceEmbeddedImages)
			return;

		const re = /<img[^>]+src="([^"]+)"/gi;
		const unique = {};
		let match;

		while (!!(match = re.exec(opt.html))) {
			if (match[1].indexOf('cid:') !== 0)
				unique[match[1]] = true;
		}

		if (!opt.attachments)
			opt.attachments = [];

		Object.keys(unique).forEach(function (src, idx) {
			const cid = 'uniqueimg_' + idx;

			opt.attachments.push({
				filename: path.basename(src),
				path: src,
				cid: cid
			});

			opt.html = opt.html.replace(new RegExp(src, 'g'), 'cid:' + cid);
		});
	}
}

module.exports = Mailer;