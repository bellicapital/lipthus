"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fsRoute = void 0;
function fsRoute(req, res, next) {
    const p = req.params.id.split('.');
    let db;
    let id;
    if (p.length === 1) {
        db = req.site.db;
        id = p[0];
    }
    else {
        db = req.site.dbs[p[0]];
        id = p[1];
    }
    db.fs.get(id).send(req, res)
        .catch(next);
}
exports.fsRoute = fsRoute;
