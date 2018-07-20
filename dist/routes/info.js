"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const methods = {
    langnames: (req) => req.ml.availableLangNames()
};
function default_1(req, res) {
    const method = methods[req.params.method];
    if (!method)
        return res.send({ error: 'Method not found' });
    method(req).then((r) => res.send(r));
}
exports.default = default_1;
;
