"use strict";
const mongoose = require('mongoose');
const getFile = (id, fss, idx = 0) => {
    return fss[idx].get(id).load()
        .then(f => f || (fss[++idx] && getFile(id, fss, idx)));
};
module.exports = function (req, res, next) {
    let id = req.params.id;
    if (!id)
        return next(new Error('No id param'));
    const m = id.match(/(^[^.]+)\.(.+)$/);
    const dbname = m && m[1];
    if (m)
        id = m[2];
    if (!mongoose.Types.ObjectId.isValid(id))
        return next();
    const fss = [];
    if (dbname) {
        if (!req.site.dbs[dbname])
            return next();
        fss.push(req.site.dbs[dbname].fs);
    }
    else {
        Object.values(req.site.dbs).forEach(db => fss.push(db.fs));
    }
    getFile(id, fss)
        .then(file => {
        if (!file)
            return next();
        res.locals.video = file.info();
        return res.htmlPage
            .init({
            title: res.locals.video.basename,
            layout: 'none'
        })
            .then(p => p
            .addCSS('embed')
            .addJS('embed')
            .addJSVars({ video: res.locals.video })
            .send('embed'));
    })
        .catch(next);
};
