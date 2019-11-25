"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require('mongoose');
const getFile = (id, fss, idx = 0) => {
    return fss[idx].get(id).load()
        .then((f) => f || (fss[++idx] && getFile(id, fss, idx)));
};
function default_1(req, res, next) {
    let id = req.params.id;
    if (!id)
        return next(new Error('No id param'));
    const m = id.match(/(^[^.]+)\.(.+)$/);
    const dbName = m && m[1];
    if (m)
        id = m[2];
    if (!mongoose.Types.ObjectId.isValid(id))
        return next();
    const fss = [];
    if (dbName) {
        if (!req.site.dbs[dbName])
            return next();
        fss.push(req.site.dbs[dbName].fs);
    }
    else {
        Object.values(req.site.dbs).forEach(db => fss.push(db.fs));
    }
    getFile(id, fss)
        .then((file) => {
        if (!file)
            return next();
        const video = res.locals.video = file.info();
        const params = {
            url: req.site.staticHost + '/embed/' + video.id,
            type: "text/html"
        };
        return res.htmlPage
            .init({
            title: video.basename
        })
            .then((p) => p.load())
            .then((p) => p
            .addOpenGraph('image', req.site.staticHost + video.thumb)
            .addOpenGraph('type', 'video')
            .addOpenGraph('video', params, true)
            // .addCSS('video')
            // .addJS('video')
            .addJSVars({ video: video })
            .send('video'));
    })
        .catch(next);
}
exports.default = default_1;
