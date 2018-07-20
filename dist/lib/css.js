"use strict";
const express_1 = require("express");
const send = (req, res, next) => {
    res.set('Expires', new Date().addDays(60).toUTCString());
    switch (req.params.ext) {
        case 'css':
            res.type('css').set('X-SourceMap', req.lessSourceMap + '.map');
            break;
        case 'map':
            res.type('text');
            break;
        default:
            return next();
    }
    res.send(req.cssResponse[req.params.ext]);
};
const combined = (req, res, next) => {
    const parts = req.params.combined.split('+');
    const files = [];
    const dirs = {
        d: req.site.dir,
        g: req.site.lipthusDir
    };
    const devicesDir = {
        g: '',
        p: 'phone/',
        t: 'tablet/',
        v: 'tv/',
        b: 'bot/',
        c: 'car/'
    };
    if (!parts.length)
        return next();
    const missing = parts.some((part) => {
        const m = part.match(/([dg])(\w)-(.+)$/);
        if (!m) // -> not found
            return true;
        req.lessSourceMap = req.params.combined.replace(/\//g, '%2F');
        files.push(dirs[m[1]] + '/public/css/' + devicesDir[m[2]] + m[3] + '.less');
        return false;
    });
    if (missing)
        next();
    else
        req.db.cacheless.getCachedFiles(files, req.lessSourceMap)
            .then((r) => req.cssResponse = r)
            .then(() => next(), next);
};
const single = (req, res, next) => {
    const deviceRoute = req.params.device !== 'g' ? req.params.device + '/' : '';
    const locations = {
        d: req.site.dir,
        g: req.site.lipthusDir
    };
    let key = req.params.key;
    const loc = locations[req.params.loc] + '/public/css/' + deviceRoute;
    let compress = false;
    if (key.indexOf('.min') > 0) {
        key = key.replace('.min', '');
        compress = true;
    }
    req.lessSourceMap = req.params.key;
    req.db.cacheless
        .getCachedFile(loc + key + '.less', compress)
        .then((r) => req.cssResponse = r)
        .then(() => next(), next);
};
module.exports = express_1.Router({ strict: true })
    .get('/:loc/:device/:key.:ext', single, send)
    .get('/:combined.:mtime.:ext', combined, send);
