"use strict";
// en desarrollo...
const express_1 = require("express");
const js = (req, res, next) => {
    res.set('Expires', new Date().addDays(60).toUTCString());
    switch (req.params.ext) {
        case 'js':
            res.type('js').set('X-SourceMap', '.map');
            break;
        case 'map':
            res.type('text');
            break;
        default:
            return next();
    }
    res.send('on developement');
};
module.exports = express_1.Router({ strict: true })
    .get('/:loc/:device/:key.:ext', js)
    .get('/:combined.:mtime.:ext', js);
