"use strict";

const debug = require('debug')('site:subscriptor');
const fs = require('fs');


class Subscriptor {
	constructor(app) {
		Object.defineProperty(this, 'app', {value: app});
		Object.defineProperty(app, 'subscriptor', {value: this});

		const unsubscribe = (fs.existsSync(app.get('dir') + '/routes/unsubscribe.js') ? app.get('dir') : '..') + '/routes/unsubscribe';

		app.use('/unsubscribe/:id', require(unsubscribe));

		this.manageComments();

		this.models = {};

		this.subscribeDb(app.db);
	}

	subscribeDb(db) {
		Object.each(db.schemas, (name, s) => {
			if (s.options.subscriptions)
				this.subscribeModel(name, db);
		});
	}

	summary() {
		const db = this.app.db;
		const ret = {};

		return db.subscription
			.count()
			.then(total => ret.total = total)
			.then(() => db.user.count({subscriptions: {$exists: true}}))
			.then(total => ret.total += total)
			.then(() => db.loggerSubscription.summary({event: 'request'}))
			.then(request => ret.request = request)
			.then(() => db.subscriptionRequest.count())
			.then(c => ret.request.total = c)
			.then(() => db.loggerSubscription.summary({event: 'join'}))
			.then(join => ret.join = join)
			// .then(() => db.subscriptionRequest.count({confirmed: true}))
			// .then(c => ret.join.total = c)
			.then(() => db.loggerSubscription.summary({event: 'unsubscribe'}))
			.then(unsubscribe => ret.unsubscribe = unsubscribe)
			.then(() => ret);
	}

	/**
	 *
	 * @param {String} model
	 * @param {String} [value="newItem"]
	 * @param {String} [type="events"]
	 * @param {String} [dbname=this.app.site.db]
	 * @returns {Promise}
	 */
	subscriptorsCount(model, value = 'newItem', type = 'events', dbname) {
		const query = {};
		const db = this.app.site.db;

		dbname = dbname || db.name;

		const key = 'subscriptions.' + dbname + '.' + model + '.' + type;

		query[key] = value;

		return db.subscription.count(query, count => db.user.count(query, count2 => count + count2));
	}

	getSubscriptors(dbname, model, type, value, onlyUsers) {
		let query = {};
		const db = this.app.site.db;
		const byEmail = {};

		if (typeof dbname === 'object') {
			query = dbname;
			onlyUsers = model;
		} else
			query['subscriptions.' + dbname + '.' + model + '.' + type] = value;

		const promises = [];

		promises.push(
			db.user.find(query)
				.select('email language name uname email_notifications devices')
				.then(users =>
					users.forEach(u => byEmail[u.email] = {
						email: u.email,
						lang: u.language,
						name: u.getName(true),
						email_notifications: u.email_notifications,
						devices: u.devices,
						user: u
					}))
		);

		if(!onlyUsers)
			promises.push(
				db.subscription
					.find(query)
					.select('email lang')
					.then(subscribed => subscribed.forEach(s => byEmail[s.email] = s.toObject()))
			);

		return Promise.all(promises)
			.then(() => Object.values(byEmail));
	}

	manageComments() {
		const site = this.app.site;
		const commentCol = site.db.comment;

		commentCol.on('itemCreated', commentId => {
			commentCol.findById(commentId, (err, comment) => {
				if (err)
					return console.error(err);

				const modelname = comment.ref.namespace.replace('dynobjects.', '');
				const itemScript = this.getItemScript(modelname);

				comment.getItem((err, item) => {
					if (err)
						return console.error(err);

					if (!item)
						return console.error('Comment Item not found');

					if (itemScript && itemScript.newComment)
						return itemScript.newComment.call(this, comment, item);

					this.newComment(comment, item);
				});
			});
		});

		commentCol.on('itemActivated', commentId => {
			this.findById(commentId, (err, comment) => {
				if (err)
					return console.error(err);

				const modelname = comment.ref.namespace.replace('dynobjects.', '');
				const itemScript = this.getItemScript(modelname);

				comment.getItem((err, item) => {
					if (err)
						return console.error(err);

					if (!item)
						return console.error('Comment Item not found');

					if (itemScript && itemScript.newComment)
						return itemScript.newComment(comment, item);

					this.newComment(comment, item);
				});
			});
		});
	}

	subscribeModel(name, db) {
		debug('subscribe to ' + name + ' in ' + db.name);

		const itemScript = this.getItemScript(name);

		db = db || this.app.site.db;

		if(!this.models[db.name])
			this.models[db.name] = {};

		this.models[db.name][name] = {
			title: db[name].modelName,
			itemScript: itemScript
		};

		if (itemScript && itemScript.init)
			return itemScript.init.call(this);

		db.model(name)
			.on('itemCreated', item => this._onItemCreated(item, name, db))
			.on('itemActivated', item => this._onItemActivated(item, name, db));
	}

	getItemScript(name) {
		const site = this.app.site;

		if (fs.existsSync(site.dir + '/subscriptions/' + name + '.js'))
			return require(site.dir + '/subscriptions/' + name);

		if(site.plugins && site.plugins[name])
			return site.plugins[name].itemScript;
	}

	_onItemCreated(item, name, db) {
		const site = this.app.site;
		const itemScript = this.getItemScript(name);

		if (itemScript)
			return itemScript.itemCreated.call(this, item);

		if (!item.active) return;

		this.getSubscriptors(db.name, name, 'events', 'newItem', function (err, subscribed) {
			if (err)
				throw err;

			if (!subscribed.length) return;

			site.notifier.itemCreated(item, subscribed);
		});
	}

	_onItemActivated(item, name, db) {
		if (!item.active) return;

		const site = this.app.site;
		const itemScript = this.getItemScript(name);

		this.getSubscriptors(db.name, name, 'items', item._id, (err, subscribed) => {
			if (err)
				throw err;

			if (!subscribed.length) return;

			if (itemScript)
				return itemScript.itemActivated.call(this, item, subscribed);

			site.notifier.itemActivated(item, subscribed);
		});
	}

	userConfirm(id) {
		const db = this.app.site.db;

		return db.subscriptionRequest
			.findById(id)
			.then(pending => {
				if (!pending)
					return;

				const subscriptions = pending.get('subscriptions');
				const email = pending.get('email');
				const lang = pending.get('lang');
				const query = {email: email};

				return db.user
					.findOne(query)
					.then(user => {
						if (user) {//es usuario
							if (user.subscriptions.constructor.name !== 'Object')
								user.subscriptions = subscriptions;
							else
								user.subscriptions = Object.extend(user.subscriptions, subscriptions);

							user.subscriptionUrl = pending.url;

							user.markModified('subscriptions');

							return user.save();
						}

						//No es usuario
						return db.subscription
							.findOne(query)
							.then(subscription => {
								if (!subscription)
									return db.subscription.create({
										email: pending.get('email'),
										subscriptions: subscriptions,
										subscriptionUrl: pending.url,
										lang: lang
									});

								subscription.set({
									subscriptionUrl: pending.url,
									lang: lang
								});

								return subscription.merge(subscriptions).save();
							});
					})
					.then(() => {
						pending.set('confirmed', true);

						this.log('join', email, subscriptions, lang);

						return pending.save();
					});
			});
	}

	getItemOptions(schema, item, cb) {
		const script = this.getItemScript(schema);

		if (!script || !script.getOptions)
			return cb(null, {});

		return script.getOptions.call(this, item, cb);
	}

	/**
	 *
	 * @param {String} email
	 * @returns {Promise}
	 */
	unsubscribe(email) {
		if(!email)
			return Promise.reject();

		const db = this.app.site.db;
		const query = {email: email};
		let found = 0;

		return db.subscription
			.findOne(query)
			.then(r => {
				if (!r)
					return;

				r.remove();

				this.log('unsubscribe', email);

				found++;
			})
			.then(() => db.user.findOne(query))
			.then(user => {
				if (!user)
					return;

				user.subscriptions = {};

				this.log('unsubscribe', email);

				found++;

				return user.save();
			})
			.then(() => found);
	}

	newComment(comment, item) {
		const site = this.app.site;

		if (!comment.active) {//notify to admin
			return site.db.lang.get('_CM_NEWCOM', function (err, _CM_NEWCOM) {
				site.notifier.toAdmin(
					_CM_NEWCOM[site.config.language],
					{X_COMMENTURL: site.protocol + '://' + site.mainHost + '/approve-comment?id=' + comment.id + '&hash=' + comment.getHash()},
					'comment_admin',
					'newComment2Approve',
					{
						id: comment._id,
						itemref: comment.ref
					}
				);
			});
		}

		site.db.lang.get('_NOT_COMMENT_NOTIFYSBJ', function (err, _NOT_COMMENT_NOTIFYSBJ) {
			site.db.user.find({
				subscriptions: {
					$elemMatch: {
						colname: comment.ref.namespace,
						id: comment.ref.oid
					}
				}
			}, function (err, users) {
				if (err)
					throw err;

				if (!users)
					return;

				const title = item.schema.options.title || item.schema.options.collection;
				const baseurl = item.schema.options.baseurl || item.schema.options.name || item.schema.options.collection;

				users.forEach(function (user) {
					const lang = user.language || site.config.language;
					const itemtype = title[lang] || title.en || title;
					const subject = (_NOT_COMMENT_NOTIFYSBJ.get(lang) || _NOT_COMMENT_NOTIFYSBJ.get(site.config.language))
						.replace('{X_ITEMTITLE}', item.title)
						.replace('{X_ITEMTYPE}', itemtype)
						.replace('{X_SITENAME}', site.config.sitename);
					const content = {
						X_UNAME: user.getName(true),
						X_ITEM_TITLE: item.title,
						X_ITEM_URL: site.protocol + ':' + site.langUrl(lang) + '/' + baseurl + '/' + item._id,
						X_COMM_ID: comment._id,
						X_UNSUBSCRIBE_URL: site.protocol + ':' + site.langUrl(lang) + '/subscriptions/' + user._id
					};
					const body = site.notifier.parseContent(site, lang, content, 'comment_notify');

					site.notifier.toUser(user, subject, body);
				});
			});
		});
	}

	log(event, email, content, lang) {
		this.app.db.loggerSubscription.log(event, email, content, lang);
	}

//ajax functions
	static ajaxRemoveUserItem(req, res, uid, db, col, itemid, cb) {
		if (req.method !== 'POST')
			return cb();

		req.db.user.findById(uid, function (err, user) {
			if (err)
				return cb(err);

			if (!user)
				return cb(new Error('User not found'));

			try {
				const items = user.subscriptions[db][col].items;
				let idx = -1;

				items.some(function (item, i) {
					if (item.toString() === itemid) {
						idx = i;
						return true;
					}
				});

				if (idx === -1)
					return cb(new Error('Not subscribed'));

				items.splice(idx, 1);

				user.set('subscriptions.' + db + '.' + col + '.items', items);
				user.markModified('subscriptions');

				user.save(function (err) {
					if (err)
						return cb(err);

					cb(null, {ok: true});
				});
			} catch (e) {
				cb(e);
			}
		});
	}
}

module.exports = Subscriptor;
