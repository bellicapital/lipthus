"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function canonicalhost(req, res, next) {
    const host = req.headers.host || '';
    // solucion temporal. OJOOOOO!!!!!!!
    if (host.indexOf('sexi.es') !== -1)
        return next();
    // end tmp
    if (!req.site.config)
        return next();
    if (req.site.config.force_www) {
        // if(!req.subdomains.length && !/^\d+\.\d+\.\d+\.\d+$/.test(req.hostname))
        // 	return res.redirect(301, req.protocol + '://www.' + req.headers.host + req.originalUrl);
    }
    else {
        if (req.subdomains[0] === 'www')
            return res.redirect(301, req.protocol + '://' + (host.substr(4)) + req.originalUrl);
    }
    next();
}
exports.canonicalhost = canonicalhost;
