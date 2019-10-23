"use strict";
module.exports = function (req, res, next) {
    if (req.query.read) {
        return req.db.notification
            .findByIdAndUpdate(req.query.read, { read: true }, { select: 'url' })
            .then(n => res.redirect(n.url))
            .catch(next);
    }
    res.htmlPage
        .init({
        layout: 'layout-mobile',
        pageTitle: 'Notificaciones',
        userLevel: 1,
        view: 'notifications'
    })
        .then(() => req.db.notification.user(req.user).limit(100))
        .then(not => {
        res.locals.notifications = not;
        res.htmlPage.send();
    })
        .catch(next);
};
