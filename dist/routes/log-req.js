"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1(req, res) {
    res.render(req.site.lipthusDir + '/views/log-req', {
        cssHead: [{ src: '/cms/css/log-req.css' }]
    });
}
exports.default = default_1;
