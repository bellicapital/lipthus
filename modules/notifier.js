"use strict";

const FCM = require('fcm-push');
const Gcm = require('node-gcm');	// deprecated
const fs = require('fs');
const debug = require('debug')('site:gcm');
const merge = require('merge-descriptors');

class Notifier {
	constructor(site) {
		Object.defineProperty(this, 'site', {value: site});

		this.serverFrom = site + " <server@" + site.domainName + ">";
	}

	/**
	 * Google Chrome Cloud Messaging (chrome.gcm)
	 * https://developer.chrome.com/apps/gcm
	 * https://developers.google.com/cloud-messaging/gcm
	 *
	 * @param {type} ids
	 * @param {type} values
	 * @param {type} cb
	 * @returns {undefined}
	 */

	/*
	gccm(ids, values, cb) {
		console.log('cgcm TODO!!!');
	}
	*/

	/**
	 * Sends a Google Cloud Message
	 *
	 * @param ids
	 * @param values
	 * @returns {Promise}
	 */
	gcm(ids, values) {
		return new Promise((ok, ko) =>
			this.gcm_(ids, values, (err, r) => err ? ko(err) : ok(r))
		);
	}

	gcm_(ids, values, cb) {
		cb = cb || function () {};

		if (!values)
			return cb(new Error('No data'));

		const site = this.site;

		if (!site.config.googleApiKey)
			return cb(new Error('No Google Api Key'));

		if (typeof values === 'string')
			values = {message: values};

		if (!values.data)
			values.data = {};

		if (!values.data.message)
			values.data.message = values.message;

		if (!values.data.title)
			values.data.title = site.config.sitename;

		if (process.env.NODE_ENV !== 'production' && values.dryRun === undefined)
			values.dryRun = true;

		debug(values);

		const msg = new Gcm.Message(values);
		const sender = new Gcm.Sender(site.config.googleApiKey);

		sender.send(msg, {registrationTokens: ids}, 4, (err, r) => {
			err && debug(err);

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

	toAdmin(subject, content, tpl, tag, extra) {
		if (tpl) {
			return this.parseContent(this.site.config.language, content, tpl, function (err, content) {
				this.toAdmin(subject, content, null, tag, extra);
			});
		}

		const site = this.site;

		site.db.user.findOne({email: site.config.adminmail}, (err, admin) => {
			// const lang = (admin && admin.language) || site.config.language;

			if (admin)
				this.toUser(admin, subject, content, tag, extra);
			else
				site.sendMail({
					from: this.serverFrom,
					to: site.config.adminmail,
					subject: subject,
					html: content
				});
		});
	}

	toEmail(opt, cb) {
		if(typeof cb === 'function')
			console.warn('notifier.toEmail() callback has been deprecated. Use Promise');

		const options = {
			from: opt.from || this.serverFrom,
			to: opt.to,
			subject: opt.subject
		};

		if (opt.bcc)
			options.bcc = opt.bcc;

		if (opt.tpl) {
			return new Promise((ok, ko) => {
				this.parseContent(opt.lang || 'es', opt.body || {}, opt.tpl, (err, content) => {
					if (err)
						return cb ? cb(err) : ko(err);

					if (content.indexOf('<') === 0)
						options.html = content;
					else
						options.text = content;

					return this.site.sendMail(options).then(ok, ko);
				});
			});
		} else {
			if (opt.text)
				options.text = opt.text;
			else if (opt.html)
				options.html = opt.html;

			return this.site.sendMail(options, cb);
		}
	}

	toUser(user, opt, content, tag, extra, tpl) {
		if(content){
			console.warn('notifier.toUser now recieves only two arguments');

			opt = {
				subject: opt,
				content: content,
				tag: tag,
				extra: extra,
				tpl: tpl
			}
		}

		if (opt.tpl) {
			return this.parseContent(user.language || this.site.config.language, opt.content, opt.tpl, function (err, content) {
				const opt = Object.assign({}, o);
				delete opt.tpl;
				opt.content = content;
				this.toUser(opt);
			});
		}

		const noti = {
			subject: opt.subject,
			content: opt.content,
			uid: user._id,
			url: opt.url,
			tag: opt.tag,
			from: opt.from,
			extra: opt.extra
		};

		this.site.db.notification.create(noti);

		if (user.email_notifications !== false) {
			this.site.sendMail({
				from: this.serverFrom,
				to: user.email,
				subject: opt.subject,
				html: opt.content
			});
		}

		if (user.devices && user.devices.length) {
			const firebase = this.site.config.firebase;

			if (!firebase || !firebase.serverkey)
				return Promise.reject(new Error('No Firebase server key'));

			const fcm = new FCM(firebase.serverkey);

			// https://firebase.google.com/docs/cloud-messaging/http-server-ref
			const options = {
				// to: ids.length === 1 ? ids[0] : undefined,
				// registration_ids: ids,//.length > 1 ? ids : undefined,
				collapse_key: this.site.key,
				// dry_run: process.env.NODE_ENV !== 'production',
				// data: noti,
				notification: {
					title: opt.subject,
					body: opt.content,
					icon: opt.icon || this.site.config.sitelogo,
					click_action: noti.url
				}
			};

			// enviamos uno a uno para comprobar si ya no está registrado y darlo de baja
			user.devices.reduce((p, device) => p.then(() => {
				options.to = device.regId;

				return fcm.send(options)
					.then(a => debug(a))
					.catch(err => {
						// jj - 5/3/18. Devuelve un string!!! y aparece un warning en la cónsola
						// ... así que lo mejor es mostrar sólo el texto del mensaje
						console.error(err);

						if (err === 'NotRegistered') {
							debug('Removing user device ' + device.regId);

							user.devices.splice(user.devices.indexOf(device.regId), 1);

							user.markModified('devices');

							return user.save();
						}
					})
			}), Promise.resolve());
		}
	}

	// noinspection JSUnusedGlobalSymbols
	toSubscriptors(dbname, model, type, value, onlyUsers, params) {
		return this.site.app.subscriptor
		// si no se facilita asunto, no se envía email a los no usuarios
			.getSubscriptors(dbname, model, type, value, onlyUsers || !params.subject)
			.then(subscriptors => {
				const promises = [];

				subscriptors.forEach(s => {
					// el suscriptor es usuario
					if(s.user){
						// si el usuario es el mismo que envía la notificación, no lo incluimos
						if(!s.user._id.equals(params.from))
							promises.push(this.toUser(s.user, params));
					} else {
						this.toEmail({
							from: params.fromEmail,
							to: s.email,
							subject: params.subject,
							html: params.content
						});
					}
				});

				return Promise.all(promises);
			});
	}

	itemCreated(item, subscribed, options, cb) {
		options.key = 'CREATED';

		if (!options.template) {
			let tpl = item.schema.toString() + '_created';

			options.template = exists(this.site.dir + '/views/mail-templates/es/' + tpl + '.pug') ? tpl : 'item_created';
		}

		return this._process(item, subscribed, options, cb);
	}

	itemActivated(item, subscribed, options, cb) {
		options.template = options.template || 'item_activated';
		options.key = 'ACTIVATED';

		this._process(item, subscribed, options, cb);
	}

	_process(item, subscribed, opt, cb) {
		opt = opt || {};

		if (subscribed === 'preview')
			return this.preview(item, opt, cb);

		const site = this.site;
		const sitename = opt.sitename || opt.content && opt.content.X_SITENAME || site.config.sitename;
		const subscriptors = [];

		subscribed.forEach(function (subscriptor) {
			subscriptors.push(subscriptor.email);
		});

		opt.testmode || site.db.notilog.create({
			item: item._id,
			opt: opt,
			subscriptors: subscriptors
		});

		site.db.lang.getMlTag(['ecms-notification', 'notification'], (err, texts) => {
			const schemaOpt = item.schema.options;
			const title = schemaOpt.title || schemaOpt.collection;
			let baseurl = schemaOpt.baseurl || schemaOpt.name || schemaOpt.collection;

			if (baseurl.indexOf('/') !== 0)
				baseurl = '/' + baseurl;

			let count = 0;
			const customk = '_NOT_' + item.schema + '_' + opt.key;
			const globalk = '_NOT_ITEM_' + opt.key;
			let content = {};

			subscribed.forEach(subscriptor => {
				const lang = subscriptor.lang || site.config.language;
				const itemtype = title[lang] || title.es || title;
				let subject = opt.subject && opt.subject[lang];
				let unsubscribeUrl = opt.unsubscribeUrl || site.externalProtocol + ':' + site.langUrl(lang) + '/unsubscribe';

				if(typeof unsubscribeUrl === 'function')
					unsubscribeUrl = unsubscribeUrl(lang);

				if (!subject) {
					if (opt.subject && opt.subject.en)
						subject = opt.subject.en;
					else
						subject = (texts[customk] && (texts[customk][lang] || texts[customk][site.config.language])) || texts[globalk][lang] || texts[globalk][site.config.language];
				}

				subject = subject
					.replace(/{X_SITENAME}/g, sitename)
					.replace(/{X_ITEMTITLE}/g, item.title)
					.replace(/{X_ITEMTYPE}/g, itemtype);

				content.X_ITEM_TITLE = item.title[lang] || item.title['es'] || item.title;
				content.X_UNAME = subscriptor.email;
				content.X_ITEM_TYPE = itemtype;
				content.X_UNSUBSCRIBE_URL = unsubscribeUrl + '?email=' + subscriptor.email;
				content.X_SITELOGO = site.logo();
				content.X_SUBJECT = subject;

				if (opt.content)
					content = merge(content, opt.content);

				if(!content.X_ITEM_URL)
					content.X_ITEM_URL = site.externalProtocol + ':' + site.langUrl(lang) + baseurl + '/' + item._id;
				else if(typeof opt.content.X_ITEM_URL === 'function')
					content.X_ITEM_URL = opt.content.X_ITEM_URL(lang);

				if (!content.X_SITEURL)
					content.X_SITEURL = site.externalProtocol + ':' + site.langUrl(lang);
				else if(typeof opt.content.X_SITEURL === 'function')
					content.X_SITEURL = opt.content.X_SITEURL(lang);

				this.parseContent(lang, content, opt.template, (err, html) => {
					// no esperamos la respuesta de los toEmail porque tarda demasiado y produce timeouts
					if (++count === subscribed.length)
						cb && cb(err, {subject: subject, html: html, subscribed: subscribed});

					if (!err)
						this.toEmail({
							from: opt.from || this.serverFrom,
							to: subscriptor.email,
							subject: subject,
							html: html
						});
				});
			});
		});
	}

	preview(item, options, cb) {
		options = options || {};

		const site = this.site;
		const sitename = options.sitename || options.content && options.content.X_SITENAME || site.config.sitename;
		const schemaOpt = item.schema.options;

		site.db.lang.getMlTag(['ecms-notification', 'notification'], (err, texts) => {
			if (err)
				return cb(err);

			const title = schemaOpt.title || schemaOpt.collection;
			let baseurl = schemaOpt.baseurl || schemaOpt.name || schemaOpt.collection;

			if (baseurl.indexOf('/') !== 0)
				baseurl = '/' + baseurl;

			const lang = options.lang || site.config.language;
			const itemtype = title[lang] || title.es || title;

			let subject = options.subject && options.subject[lang];

			const customk = '_NOT_' + item.schema + '_' + options.key;
			const globalk = '_NOT_ITEM_' + options.key;
			const identifier = schemaOpt.identifier && item[schemaOpt.identifier] || item.title;
			const itemTitle = identifier && (identifier[lang] || identifier['es']) || identifier;
			let content = {
				X_ITEM_TITLE: itemTitle
			};

			if (!subject) {
				if (options.subject && options.subject.en)
					subject = options.subject.en;
				else
					subject = (texts[customk] && (texts[customk][lang] || texts[customk][site.config.language])) || texts[globalk][lang] || texts[globalk][site.config.language];
			}

			subject = subject
				.replace(/{X_SITENAME}/g, sitename)
				.replace(/{X_ITEMTITLE}/g, itemTitle)
				.replace(/{X_ITEMTYPE}/g, itemtype);

			content.X_UNAME = 'preview';
			content.X_ITEM_TYPE = itemtype;
			content.X_SITELOGO = site.logo();
			content.X_SUBJECT = subject;

			if (options.content)
				content = merge(content, options.content);

			if(!content.X_ITEM_URL)
				content.X_ITEM_URL = site.externalProtocol + ':' + site.langUrl(lang) + baseurl + '/' + item._id;
			else if(typeof content.X_ITEM_URL === 'function')
				content.X_ITEM_URL = content.X_ITEM_URL(lang);

			if (!content.X_SITEURL)
				content.X_SITEURL = site.externalProtocol + ':' + site.langUrl(lang);
			else if(typeof content.X_SITEURL === 'function')
				content.X_SITEURL = content.X_SITEURL(lang);

			let unsubscribeUrl = options.unsubscribeUrl || site.externalProtocol + ':' + site.langUrl(lang) + '/unsubscribe';

			if(typeof unsubscribeUrl === 'function')
				unsubscribeUrl = unsubscribeUrl(lang);

			content.X_UNSUBSCRIBE_URL = unsubscribeUrl + '?email=preview';

			this.parseContent(lang, content, options.template, (err, html) => {
				cb(err, {
					from: options.from || this.serverFrom,
					to: 'preview',
					subject: subject,
					html: html,
					params: content
				});
			});
		});
	}

	parseContent(lang, content, template, cb) {
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

		site.app.render(tpl, content, (err, html) => cb.call(this, err, html));
	}

	templateFile(tpl, lang) {
		if (exists(tpl))
			return tpl;

		const site = this.site;

		tpl = tpl + '.pug';

		let route = false;
		let routes = [
				tpl,
				site.dir + '/views/mail-templates/' + lang + '/' + tpl,
				site.dir + '/views/mail-templates/es/' + tpl,
				site.lipthusDir + '/views/mail-templates/' + lang + '/' + tpl,
				site.lipthusDir + '/views/mail-templates/es/' + tpl
			];

		routes.some(function (r) {
			if (exists(r)) {
				route = r;

				return true;
			}
		});

		return route;
	}
}


module.exports = Notifier;

function exists(fn){
	try {
		fs.accessSync(fn);
		return true;
	} catch(ex) {
		return false;
	}
}
