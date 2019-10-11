"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const modules_1 = require("../modules");
const mongoose_1 = require("mongoose");
function default_1(req, res, next) {
    if (!mongoose_1.Types.ObjectId.isValid(req.params.id))
        return next();
    req.db.cache.findById(req.params.id)
        .then(file => {
        if (!file)
            return next();
        return modules_1.BinDataFile.fromMongo(file).send(req, res);
    })
        .catch(next);
}
exports.default = default_1;
