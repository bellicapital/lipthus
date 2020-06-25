"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userPage = void 0;
const mongoose_1 = require("mongoose");
const ObjectId = mongoose_1.Types.ObjectId;
function userPage(req, res, next) {
    const query = ObjectId.isValid(req.params.uid) ? { _id: ObjectId(req.params.uid) } : { uname: req.params.uid };
    req.db.user
        .findOne(query)
        .then((user) => user ? res.htmlPage.setItem(user) : Promise.reject(new Error('Not user')))
        .then(() => req.ml.load("ecms-user"))
        .then(() => res.htmlPage
        .init({
        pageTitle: req.site.config.sitename + ' -> users -> ' + res.locals.item.getName(),
        layout: 'base',
        view: 'user',
        userLevel: 1
    }))
        .then((p) => p.addCSS('user').send())
        .catch(next);
}
exports.userPage = userPage;
