"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function fsRoute(req, res, next) {
    req.site.db.fs.get(req.params.id).send(req, res)
        .catch(next);
}
exports.fsRoute = fsRoute;
;
