import {Site} from "./site";

const nodemailer = require('nodemailer');
const sesTransport = require('nodemailer-ses-transport');
const path = require('path');

export class Mailer {
	public transport: any;

	constructor(conf: any, public site: Site) {
		conf = conf || {};

		if (conf.sesTransport) {
			process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
			conf = sesTransport(conf.sesTransport);
		}

		this.transport = nodemailer.createTransport(conf);
		Object.defineProperty(this, 'site', {value: site});
	}

	send(opt: any) {
		this.checkOptions(opt);

		return this.transport.sendMail(opt);
	}

	checkOptions(opt: any) {
		this.ensureForceEmbeddedImages(opt);
		this.ensureFrom(opt);
	}

	ensureFrom(opt: any) {
		if (!opt.from)
			opt.from = this.site + " <noreply@" + (this.site.domainName.replace(/^\w+\.([^.]+\.\w+)$/, '$1')) + ">";
	}

	ensureForceEmbeddedImages(opt: any) {
		if (opt.forceEmbeddedImages === undefined)
			opt.forceEmbeddedImages = true;

		if (!opt.forceEmbeddedImages)
			return;

		const re = /<img[^>]+src="([^"]+)"/gi;
		const unique: any = {};
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
