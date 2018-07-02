"use strict";
module.exports = function (req, res) {
    res.status(404).render(req.site.lipthusDir + '/views/status/404', { host: req.headers.host });
};
