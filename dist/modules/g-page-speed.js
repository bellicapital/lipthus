"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GPageSpeedMiddleWare = void 0;
exports.GPageSpeedMiddleWare = (req, res, next) => {
    if (req.query.gpsi !== undefined)
        res.locals.gpsi = req.query.gpsi !== false;
    else if (req.site.config.detect_gpsi) {
        const ua = req.get('user-agent');
        res.locals.gpsi = ua && ua.indexOf('Speed Insights') > 0;
    }
    next();
};
