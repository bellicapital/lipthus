"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1(req, res) {
    res.status(404).render(req.site.lipthusDir + '/views/status/404', { host: req.headers.host });
}
exports.default = default_1;
