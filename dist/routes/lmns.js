"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (req, res, next) => {
    const r = req.params.schema.match(/^([^.]+)\.(.+)$/);
    const db = r ? r[1] : req.db.name;
    const schema = r ? r[2] : req.params.schema;
    res.htmlPage
        .init({
        layout: 'base',
        view: 'lmn',
        userLevel: 3
    })
        .then(page => page.addCSS('lmns'))
        .then(() => req.site.dbs[db][schema].findById(req.params.id))
        .then((item) => {
        res.htmlPage.setItem(item).addCSS('lmns').pageTitle = item.title;
        return item.things4show(req);
    }).then((values) => {
        delete values.title;
        delete values.parents;
        delete values.children;
        delete values._id;
        res.locals.itemValues = values;
        res.htmlPage.send();
    })
        .catch(next);
};
