"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_gcm_1 = require("node-gcm");
const FCM = require('fcm-push');
const fs = require('fs');
const debug = require('debug')('site:gcm');
class Notifier {
    constructor(site) {
        this.site = site;
        Object.defineProperty(this, 'site', { value: site });
        this.serverFrom = site + " <server@" + site.domainName + ">";
    }
    /**
     * Sends a Google Cloud Message
     *
     * @param ids
     * @param values
     * @returns {Promise}
     */
    gcm(ids, values) {
        return new Promise((ok, ko) => this.gcm_(ids, values, (err, r) => err ? ko(err) : ok(r)));
    }
    gcm_(ids, values, cb) {
        cb = cb || function () {
        };
        if (!values)
            return cb(new Error('No data'));
        const site = this.site;
        if (!site.config.googleApiKey)
            return cb(new Error('No Google Api Key'));
        if (typeof values === 'string')
            values = { message: values };
        if (!values.data)
            values.data = {};
        if (!values.data.message)
            values.data.message = values.message;
        if (!values.data.title)
            values.data.title = site.config.sitename;
        if (process.env.NODE_ENV !== 'production' && values.dryRun === undefined)
            values.dryRun = true;
        debug(values);
        const msg = new node_gcm_1.Message(values);
        const sender = new node_gcm_1.Sender(site.config.googleApiKey);
        sender.send(msg, { registrationTokens: ids }, 4, (err, r) => {
            if (err)
                debug(err);
            new site.db
                .loggerGCM({
                data: values,
                ids: ids,
                response: err || r
            })
                .save()
                .catch(console.error.bind(console));
            if (r) {
                r.ids = ids;
                r.message = values;
            }
            cb(err, r);
        });
    }
    async toAdmin(subject, content, tpl, tag, extra) {
        if (tpl) {
            const r = this.parseContent(this.site.config.language, content, tpl);
            return this.toAdmin(subject, r, null, tag, extra);
        }
        const site = this.site;
        const admin = await site.db.user.findOne({ email: site.config.adminmail });
        if (admin)
            this.toUser(admin, {
                subject: subject,
                content: content,
                tag: tag,
                extra: extra
            });
        else
            return site.sendMail({
                from: this.serverFrom,
                to: site.config.adminmail,
                subject: subject,
                html: content
            });
    }
    async toEmail(opt) {
        const options = {
            from: opt.from || this.serverFrom,
            to: opt.to,
            subject: opt.subject
        };
        if (opt.bcc)
            options.bcc = opt.bcc;
        if (opt.tpl) {
            const content = await this.parseContent(opt.lang || 'es', opt.body || {}, opt.tpl);
            if (content.indexOf('<') === 0)
                options.html = content;
            else
                options.text = content;
        }
        else {
            if (opt.text)
                options.text = opt.text;
            else if (opt.html)
                options.html = opt.html;
        }
        return this.site.sendMail(options);
    }
    async toUser(user, opt = {}) {
        if (opt.tpl) {
            const r = await this.parseContent(user.language || this.site.config.language, opt.content, opt.tpl);
            const opt2 = Object.assign({}, opt);
            delete opt2.tpl;
            opt2.content = r;
            this.toUser(user, opt2);
        }
        const notification = {
            subject: opt.subject,
            content: opt.content,
            uid: user._id,
            url: opt.url,
            tag: opt.tag,
            from: opt.from,
            extra: opt.extra
        };
        await this.site.db.notification.create(notification);
        if (user.email_notifications !== false && opt.subscribed.email) {
            // specific email parameters
            const email = opt.email || {};
            return this.site.sendMail({
                from: email.from || opt.fromEmail || this.serverFrom,
                to: user.formatEmailTo,
                subject: email.subject || opt.subject,
                html: email.body || opt.content
            });
        }
        if (!opt.subscribed.device || !user.devices || !user.devices.length)
            return;
        const firebase = this.site.config.firebase;
        if (!firebase || !firebase.serverkey)
            throw new Error('No Firebase server key');
        const fcm = new FCM(firebase.serverkey);
        // https://firebase.google.com/docs/cloud-messaging/http-server-ref
        const options = {
            // to: ids.length === 1 ? ids[0] : undefined,
            // registration_ids: ids,//.length > 1 ? ids : undefined,
            collapse_key: this.site.key,
            dry_run: process.env.NODE_ENV !== 'production',
            // data: noti,
            notification: {
                title: opt.subject,
                body: opt.content,
                icon: opt.icon || this.site.config.sitelogo,
                click_action: notification.url
            }
        };
        // enviamos uno a uno para comprobar si ya no está registrado y darlo de baja
        for (const device of user.devices) {
            options.to = device.regId;
            await fcm.send(options)
                .then((a) => debug(a))
                .catch((err) => {
                // jj - 5/3/18. Devuelve un string!!! y aparece un warning en la cónsola
                // ... así que lo mejor es mostrar sólo el texto del mensaje
                console.error(err);
                if (err === 'NotRegistered') {
                    debug('Removing user device ' + device.regId);
                    user.devices.splice(user.devices.indexOf(device.regId), 1);
                    user.markModified('devices');
                    return user.save();
                }
            });
        }
    }
    // noinspection JSUnusedGlobalSymbols
    async toSubscriptors(dbName, model, type, value, onlyUsers, params) {
        // si no se facilita asunto, no se envía email a los no usuarios
        if (!onlyUsers && !params.subject)
            onlyUsers = true;
        const subscriptors = await this.site.app.subscriptor
            .getSubscriptors(dbName, model, type, value, onlyUsers);
        for (const s of subscriptors) {
            // el suscriptor es usuario
            if (s.user) {
                // si el usuario es el mismo que envía la notificación, no lo incluimos
                if (!s.user._id.equals(params.from))
                    await this.toUser(s.user, Object.assign({}, { subscribed: s.subscribed }, params));
            }
            else if (!onlyUsers) {
                await this.toEmail({
                    from: params.fromEmail,
                    to: s.get('email'),
                    subject: params.subject,
                    html: params.content
                });
            }
        }
    }
    itemCreated(item, subscribed, options = {}) {
        options.key = 'CREATED';
        if (!options.template) {
            const tpl = item.schema.toString() + '_created';
            options.template = fs.existsSync(this.site.srcDir + '/views/mail-templates/es/' + tpl + '.pug') ? tpl : 'item_created';
        }
        return this._process(item, subscribed, options);
    }
    itemActivated(item, subscribed, options = {}) {
        options.template = options.template || 'item_activated';
        options.key = 'ACTIVATED';
        return this._process(item, subscribed, options);
    }
    _processAndPreviewCommon(content, subject, options, item, itemType, lang, baseUrl) {
        if (options.content)
            Object.assign(content, options.content);
        content.X_ITEM_TYPE = itemType;
        content.X_SITELOGO = this.site.logo();
        content.X_SUBJECT = subject;
        if (options.content)
            Object.assign(content, options.content);
        if (!content.X_ITEM_URL)
            content.X_ITEM_URL = this.site.externalProtocol + ':' + this.site.langUrl(lang) + baseUrl + '/' + item._id;
        else if (typeof content.X_ITEM_URL === 'function')
            content.X_ITEM_URL = content.X_ITEM_URL(lang);
        if (!content.X_SITEURL)
            content.X_SITEURL = this.site.externalProtocol + ':' + this.site.langUrl(lang);
        else if (typeof content.X_SITEURL === 'function')
            content.X_SITEURL = content.X_SITEURL(lang);
    }
    async _process(item, subscribed, options = {}) {
        if (typeof subscribed === 'string')
            return this.preview(item, options);
        const site = this.site;
        const siteName = options.sitename || options.content && options.content.X_SITENAME || site.config.sitename;
        const subscriptors = subscribed.map((s) => s.email);
        if (!options.testmode) {
            site.db.notilog.create({
                item: item._id,
                opt: options,
                subscriptors: subscriptors
            });
        }
        const texts = await site.db.lang.getMlTag(['ecms-notification', 'notification']);
        const schemaOpt = item.schema.options;
        const title = schemaOpt.title || schemaOpt.collection;
        let baseUrl = schemaOpt.baseurl || schemaOpt.name || schemaOpt.collection;
        if (baseUrl.indexOf('/') !== 0)
            baseUrl = '/' + baseUrl;
        const customK = '_NOT_' + item.schema + '_' + options.key;
        const globalK = '_NOT_ITEM_' + options.key;
        const content = {};
        for (const subscriptor of subscribed) {
            const lang = subscriptor.lang || site.config.language;
            const itemType = title[lang] || title.es || title;
            let subject = options.subject && options.subject[lang];
            let unsubscribeUrl = options.unsubscribeUrl || site.externalProtocol + ':' + site.langUrl(lang) + '/unsubscribe';
            if (typeof unsubscribeUrl === 'function')
                unsubscribeUrl = unsubscribeUrl(lang);
            if (!subject) {
                if (options.subject && options.subject.en)
                    subject = options.subject.en;
                else
                    subject = (texts[customK] && (texts[customK][lang] || texts[customK][site.config.language])) || texts[globalK][lang] || texts[globalK][site.config.language];
            }
            subject = subject
                .replace(/{X_SITENAME}/g, siteName)
                .replace(/{X_ITEMTITLE}/g, item.title)
                .replace(/{X_ITEMTYPE}/g, itemType);
            content.X_ITEM_TITLE = item.title[lang] || item.title['es'] || item.title;
            content.X_UNAME = subscriptor.email;
            content.X_UNSUBSCRIBE_URL = unsubscribeUrl + '?email=' + subscriptor.email;
            this._processAndPreviewCommon(content, subject, options, item, itemType, lang, baseUrl);
            // no esperamos la respuesta de los toEmail porque tarda demasiado y produce timeouts
            this.toEmail({
                from: options.from || this.serverFrom,
                to: subscriptor.email,
                subject: subject,
                html: await this.parseContent(lang, content, options.template)
            });
        }
    }
    async preview(item, options) {
        options = options || {};
        const site = this.site;
        const sitename = options.sitename || options.content && options.content.X_SITENAME || site.config.sitename;
        const schemaOpt = item.schema.options;
        const texts = await site.db.lang.getMlTag(['ecms-notification', 'notification']);
        const title = schemaOpt.title || schemaOpt.collection;
        let baseUrl = schemaOpt.baseurl || schemaOpt.name || schemaOpt.collection;
        if (baseUrl.indexOf('/') !== 0)
            baseUrl = '/' + baseUrl;
        const lang = options.lang || site.config.language;
        const itemType = title[lang] || title.es || title;
        let subject = options.subject && options.subject[lang];
        const customK = '_NOT_' + item.schema + '_' + options.key;
        const globalK = '_NOT_ITEM_' + options.key;
        const identifier = schemaOpt.identifier && item[schemaOpt.identifier] || item.title;
        const itemTitle = identifier && (identifier[lang] || identifier['es']) || identifier;
        const content = {
            X_ITEM_TITLE: itemTitle
        };
        if (!subject) {
            if (options.subject && options.subject.en)
                subject = options.subject.en;
            else
                subject = (texts[customK] && (texts[customK][lang] || texts[customK][site.config.language])) || texts[globalK][lang] || texts[globalK][site.config.language];
        }
        subject = subject
            .replace(/{X_SITENAME}/g, sitename)
            .replace(/{X_ITEMTITLE}/g, itemTitle)
            .replace(/{X_ITEMTYPE}/g, itemType);
        content.X_UNAME = 'preview';
        content.X_ITEM_TYPE = itemType;
        content.X_SITELOGO = site.logo();
        content.X_SUBJECT = subject;
        this._processAndPreviewCommon(content, subject, options, item, itemType, lang, baseUrl);
        let unsubscribeUrl = options.unsubscribeUrl || site.externalProtocol + ':' + site.langUrl(lang) + '/unsubscribe';
        if (typeof unsubscribeUrl === 'function')
            unsubscribeUrl = unsubscribeUrl(lang);
        content.X_UNSUBSCRIBE_URL = unsubscribeUrl + '?email=preview';
        return {
            from: options.from || this.serverFrom,
            to: 'preview',
            subject: subject,
            html: await this.parseContent(lang, content, options.template),
            params: content
        };
    }
    parseContent(lang, content, template) {
        const site = this.site;
        const tpl = this.templateFile(template, lang);
        if (!tpl)
            throw new Error('Template ' + template + ' not found.');
        if (!content.X_SITENAME)
            content.X_SITENAME = site.config.sitename;
        if (!content.X_ADMINMAIL)
            content.X_ADMINMAIL = site.config.adminmail;
        if (!content.X_SITEURL)
            content.X_SITEURL = site.externalProtocol + ':' + site.langUrl(lang);
        content.lang = lang;
        return new Promise((ok, ko) => {
            site.app.render(tpl, content, (err, html) => {
                if (err)
                    ko(err);
                else
                    ok(html);
            });
        });
    }
    templateFile(tpl, lang) {
        if (fs.existsSync(tpl))
            return tpl;
        const site = this.site;
        tpl = tpl + '.pug';
        const routes = [
            tpl,
            site.srcDir + '/views/mail-templates/' + lang + '/' + tpl,
            site.srcDir + '/views/mail-templates/es/' + tpl,
            site.lipthusDir + '/views/mail-templates/' + lang + '/' + tpl,
            site.lipthusDir + '/views/mail-templates/es/' + tpl
        ];
        return routes.find(fs.existsSync);
    }
}
exports.Notifier = Notifier;
