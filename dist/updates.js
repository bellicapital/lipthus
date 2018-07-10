"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updates = (site, version) => {
    switch (version) {
        case '1.6.1':
        case '1.6.2':
            return site.db.config
                .remove({ name: { $in: ['protocol', 'external_protocol'] } })
                .then(() => ({ ok: true }));
        default:
            return Promise.resolve({ ok: true });
    }
};
