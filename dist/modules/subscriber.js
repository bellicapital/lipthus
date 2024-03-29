"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscriber = void 0;
const Debug = require("debug");
const fs_1 = require("fs");
const debug = Debug('site:subscriber');
class Subscriber {
    constructor(app) {
        this.app = app;
        this.models = {};
        Object.defineProperty(app, 'subscriber', { value: this });
        const unsubscribe = (fs_1.existsSync(app.get('dir') + '/routes/unsubscribe.js') ? app.get('dir') : '..') + '/routes/unsubscribe';
        app.use('/unsubscribe/:id', require(unsubscribe));
        this.manageComments();
        this.subscribeDb(app.db);
    }
    static init(app) {
        return new Subscriber(app);
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
            .estimatedDocumentCount()
            .then((total) => ret.total = total)
            .then(() => db.user.countDocuments({ subscriptions: { $exists: true } }))
            .then((total) => ret.total += total)
            .then(() => db.loggerSubscription.summary({ event: 'request' }))
            .then((request) => ret.request = request)
            .then(() => db.subscriptionRequest.countDocuments())
            .then((c) => ret.request.total = c)
            .then(() => db.loggerSubscription.summary({ event: 'join' }))
            .then((join) => ret.join = join)
            // .then(() => db.subscriptionRequest.countDocuments({confirmed: true}))
            // .then(c => ret.join.total = c)
            .then(() => db.loggerSubscription.summary({ event: 'unsubscribe' }))
            .then((unsubscribe) => ret.unsubscribe = unsubscribe)
            .then(() => ret);
    }
    // noinspection JSUnusedGlobalSymbols
    /**
     *
     * @param {String} model
     * @param {String} [value="newItem"]
     * @param {String} [type="events"]
     * @param {String} [dbName=this.app.site.db]
     * @returns {Promise}
     */
    subscribersCount(model, value = 'newItem', type = 'events', dbName) {
        const query = {};
        const db = this.app.site.db;
        dbName = dbName || db.name;
        const key = 'subscriptions.' + dbName + '.' + model + '.' + type;
        query[key] = value;
        return db.subscription.countDocuments(query)
            .then((count) => db.user.countDocuments(query).then((count2) => count + count2));
    }
    getSubscribers(dbName, model, type, value, onlyUsers) {
        let query = {};
        const db = this.app.site.db;
        const byEmail = {};
        if (typeof dbName === 'object') {
            query = dbName;
            onlyUsers = model;
        }
        else
            query['subscriptions.' + dbName + '.' + model + '.' + type + '.key'] = value;
        return db.user.find(query)
            .select('email language name uname email_notifications devices subscriptions')
            .exec()
            .then((users) => users.forEach(u => byEmail[u.email] = {
            email: u.email,
            lang: u.language,
            name: u.getName(true),
            email_notifications: u.email_notifications,
            devices: u.devices,
            subscribed: u.get('subscriptions')[dbName][model][type].find((su) => su.key === value),
            user: u
        }))
            .then(() => {
            if (!onlyUsers) {
                return db.subscription
                    .find(query)
                    .select('email lang subscriptions')
                    .then((subscribed) => subscribed.forEach(s => {
                    byEmail[s.email] = s.toObject();
                    byEmail[s.email].subscribed = s.get('subscriptions')[dbName][model][type].find((su) => su.key === value);
                }));
            }
        })
            .then(() => Object.values(byEmail));
    }
    manageComments() {
        const site = this.app.site;
        const commentCol = site.db.comment;
        commentCol.on('itemCreated', async (commentId) => {
            const comment = await commentCol.findById(commentId);
            const modelName = comment.ref.namespace.replace('dynobjects.', '');
            const itemScript = this.getItemScript(modelName);
            return comment.getItem()
                .then((item) => {
                if (!item)
                    return console.error('Comment Item not found');
                if (itemScript && itemScript.newComment)
                    return itemScript.newComment.call(this, comment, item);
                this.newComment(comment, item);
            });
        });
        commentCol.on('itemActivated', async (commentId) => {
            const comment = await commentCol.findById(commentId);
            const item = await comment.getItem();
            if (!item)
                return console.error('Comment Item not found');
            this.newComment(comment, item);
        });
    }
    subscribeModel(name, db) {
        debug('subscribe to ' + name + ' in ' + db.name);
        const itemScript = this.getItemScript(name);
        db = db || this.app.site.db;
        if (!this.models[db.name])
            this.models[db.name] = {};
        this.models[db.name][name] = {
            title: db[name].modelName,
            itemScript: itemScript
        };
        if (itemScript && itemScript.init)
            return itemScript.init.call(this);
        db.model(name)
            .on('itemCreated', (item) => this._onItemCreated(item, name, db))
            .on('itemActivated', (item) => this._onItemActivated(item, name, db));
    }
    getItemScript(name) {
        const site = this.app.site;
        if (fs_1.existsSync(site.dir + '/subscriptions/' + name + '.js'))
            return require(site.dir + '/subscriptions/' + name);
        if (site.plugins && site.plugins[name])
            return site.plugins[name].itemScript;
    }
    async _onItemCreated(item, name, db) {
        if (!item.active)
            return;
        const subscribed = await this.getSubscribers(db.name, name, 'events', 'newItem', false);
        if (subscribed.length)
            await this.app.site.notifier.itemCreated(item, subscribed);
    }
    async _onItemActivated(item, name, db) {
        if (!item.active)
            return;
        const subscribed = await this.getSubscribers(db.name, name, 'items', item._id, false);
        if (subscribed.length)
            await this.app.site.notifier.itemActivated(item, subscribed);
    }
    userConfirm(id) {
        const db = this.app.site.db;
        return db.subscriptionRequest
            .findById(id)
            .then((pending) => {
            if (!pending)
                return;
            const subscriptions = pending.get('subscriptions');
            const email = pending.get('email');
            const lang = pending.get('lang');
            const query = { email: email };
            return db.user
                .findOne(query)
                .then((user) => {
                if (user) { // is user
                    if (user.subscriptions.constructor.name !== 'Object')
                        user.subscriptions = subscriptions;
                    else
                        user.subscriptions = Object.assign(user.subscriptions, subscriptions);
                    user.subscriptionUrl = pending.url;
                    user.markModified('subscriptions');
                    return user.save();
                }
                // not user
                return db.subscription
                    .findOne(query)
                    .then((subscription) => {
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
    /**
     *
     * @param {String} email
     * @returns {Promise}
     */
    unsubscribe(email) {
        if (!email)
            return Promise.reject();
        const db = this.app.site.db;
        const query = { email: email };
        let found = 0;
        return db.subscription
            .findOne(query)
            .then((r) => {
            if (!r)
                return;
            r.remove();
            this.log('unsubscribe', email);
            found++;
        })
            .then(() => db.user.findOne(query))
            .then((user) => {
            if (!user)
                return;
            user.subscriptions = {};
            this.log('unsubscribe', email);
            found++;
            return user.save();
        })
            .then(() => found);
    }
    async newComment(comment, item) {
        const site = this.app.site;
        if (!comment.active) { // notify to admin
            return site.db.lang.get('_CM_NEWCOM', function (err, _CM_NEWCOM) {
                site.notifier.toAdmin(_CM_NEWCOM[site.config.language], { X_COMMENTURL: site.protocol + '://' + site.mainHost + '/approve-comment?id=' + comment.id + '&hash=' + comment.getHash() }, 'comment_admin', 'newComment2Approve', {
                    id: comment._id,
                    itemref: comment.ref
                });
            });
        }
        site.db.lang.get('_NOT_COMMENT_NOTIFYSBJ', (err, _NOT_COMMENT_NOTIFYSBJ) => {
            site.db.user.find({
                subscriptions: {
                    $elemMatch: {
                        colname: comment.ref.namespace,
                        id: comment.ref.oid
                    }
                }
            }, (err2, users) => {
                if (err2)
                    throw err2;
                if (!users)
                    return;
                const title = item.schema.options.title || item.schema.options.collection;
                const baseurl = item.schema.options.baseurl || item.schema.options.name || item.schema.options.collection;
                users.forEach(function (user) {
                    const lang = user.language || site.config.language;
                    const itemType = title[lang] || title.en || title;
                    const subject = (_NOT_COMMENT_NOTIFYSBJ.get(lang) || _NOT_COMMENT_NOTIFYSBJ.get(site.config.language))
                        .replace('{X_ITEMTITLE}', item.title)
                        .replace('{X_ITEMTYPE}', itemType)
                        .replace('{X_SITENAME}', site.config.sitename);
                    const content = {
                        X_UNAME: user.getName(true),
                        X_ITEM_TITLE: item.title,
                        X_ITEM_URL: site.protocol + ':' + site.langUrl(lang) + '/' + baseurl + '/' + item._id,
                        X_COMM_ID: comment._id,
                        X_UNSUBSCRIBE_URL: site.protocol + ':' + site.langUrl(lang) + '/subscriptions/' + user._id
                    };
                    site.notifier.parseContent(lang, content, 'comment_notify')
                        .then((body) => site.notifier.toUser(user, { subject: subject, content: body }));
                });
            });
        });
    }
    log(event, email, content, lang) {
        this.app.db.loggerSubscription.log(event, email, content, lang);
    }
}
exports.Subscriber = Subscriber;
