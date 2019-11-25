"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const ObjectId = require('mongoose').mongo.ObjectId;
exports.default = (req, res, next) => {
    const customScript = req.site.dir + '/routes/item-comments.js';
    if (fs.existsSync(customScript))
        return require(customScript)(req, res, next)
            .catch(next);
    req.db.comment
        .find4show({
        active: true,
        'ref.$id': ObjectId(req.params.itemid)
    }, 100)
        .then((comments) => res.locals.comments = comments)
        .then(() => req.ml.load('ecms-comment'))
        .then((lc) => res.locals.LC = lc)
        .then(() => res.render('include/item-comments'))
        .catch(next);
};
