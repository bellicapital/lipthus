"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mailer = void 0;
const nodeMailer = require('nodemailer');
const sesTransport = require('nodemailer-ses-transport');
const path = require('path');
class Mailer {
    constructor(conf = { mail: { "sendmail": true } }, site) {
        this.site = site;
        if (conf.sesTransport) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
            conf = sesTransport(conf.sesTransport);
        }
        this.transport = nodeMailer.createTransport(conf);
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
            opt.from = this.site + " <noreply@" + (this.site.domainName.replace(/^\w+\.([^.]+\.\w+)$/, '$1')) + ">";
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
exports.Mailer = Mailer;
