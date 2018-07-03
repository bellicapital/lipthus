"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
const fs = require('fs');
const getView = (status, req) => {
    let ret = null;
    if (/^50.$/.test("500"))
        status = '50x';
    req.app.get('views').some((view) => {
        if (fs.existsSync(view + '/status/' + status + '.pug')) {
            ret = status;
            return true;
        }
    });
    return 'status/' + (ret || 'error');
};
function errorHandler(err_, req, res, next) {
    let err;
    if (!(err_ instanceof Error) && !isNaN(+err_)) {
        const status = parseInt(err_, 10);
        err = new Error();
        err.status = status;
    }
    else
        err = err_;
    if (err.status === 401) {
        if (!res.headersSent) {
            return res.redirect('/login?referrer=' + encodeURIComponent(req.originalUrl));
        }
        return next();
    }
    if (err.status === 403) {
        if (!res.headersSent) {
            return res.status(err.status).render(req.site.lipthusDir + '/views/status/403', {
                path: req.path,
                referer: req.get('referer')
            });
        }
        return next();
    }
    if (err.status && err.status > 400 && err.status < 500)
        return next();
    if (!err.status)
        err.status = 500;
    res.status(err.status);
    (req.logger || new logger_1.LipthusLogger(req)).logError(err).then(() => {
        console.error("Exception at " + req.originalUrl);
        console.error(err);
    });
    res.render(getView(err.status.toString(), req), {
        message: err.message,
        error: err
    });
}
exports.errorHandler = errorHandler;