"use strict";
/**
 *
 * @param req {object} IncomingMessage
 * @param res {object} ServerResponse
 * @param next {function}
 * @returns {*}
 */
/** @namespace db.dynobject */
/** @namespace req.ml */
/** @namespace res.htmlPage */
module.exports = (req, res, next) => {
    if (!req.user)
        return res.redirect('/login');
    res.htmlPage
        .init({
        layout: 'layout-mobile',
        pageTitle: 'Subscripciones',
        userLevel: 1,
        view: 'user-subscriptions'
    })
        .then(() => {
        if (req.params.uid === req.user.id || req.params.uid === req.user.uname)
            return req.user;
        const query = ObjectId.isValid(req.params.uid) ? { _id: ObjectId(req.params.uid) } : { uname: req.params.uid };
        return req.db.user.findOne(query);
    })
        .then(user => {
        if (!user)
            return next();
        if ([user.id, user.uname].indexOf(req.params.uid) === -1)
            throw 403;
        res.locals.userid = user.id;
        return req.ml.load(['subscription', 'ecms-subscription', 'ecms-comment'])
            .then(lc => {
            const subscriptions = user.subscriptions || {};
            res.locals.subscriptions = [];
            return Object.keys(req.site.dbs).map(dbname => {
                const db = req.site.dbs[dbname];
                if (!subscriptions[dbname])
                    subscriptions[dbname] = {};
                return db.dynobject.getSchemas()
                    .then(schemas => {
                    let s;
                    Object.keys(schemas).forEach(colname => {
                        s = schemas[colname].options;
                        if (!s.subscriptions)
                            return;
                        if (!subscriptions[dbname][colname])
                            subscriptions[dbname][colname] = { events: [] };
                        else if (!subscriptions[dbname][colname].events)
                            subscriptions[dbname][colname].events = [];
                        //noinspection JSUnresolvedVariable
                        const ise = s.subscriptionEvents;
                        const se = {
                            newItem: { caption: lc['_SUBS_newItem_' + colname] || lc._SUBS_newItem },
                            modified: { caption: lc['_SUBS_activated_' + colname] || lc._SUBS_activated },
                            itemCreated: { caption: 'Nueva socia creada', level: 2 },
                            newComment: { caption: lc['_CM_NEWCOM_' + colname] || lc['_CM_NEWCOM'] }
                        };
                        if (ise) {
                            Object.keys(ise).forEach(k => {
                                se[k] = ise[k];
                                if (lc[ise[k].caption])
                                    se[k].caption = lc[ise[k].caption];
                            });
                        }
                        Object.keys(se).forEach(k => se[k].value = subscriptions[dbname][colname].events.indexOf(k) !== -1);
                        let items;
                        if (subscriptions[dbname][colname].items)
                            items = subscriptions[dbname][colname].items;
                        res.locals.subscriptions.push({
                            db: dbname,
                            colname: colname,
                            title: s.title.getLang(req.ml.lang),
                            items: items,
                            events: se
                        });
                    });
                });
            });
        })
            .then(promises => Promise.all(promises))
            .then(() => res.htmlPage
            .addCSS('user-subscriptions.css')
            .addJS('user-subscriptions.js')
            .send());
    })
        .catch(next);
};
