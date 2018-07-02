"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updates = (site, version) => {
    switch (version) {
        case '0.0.0':
        // return site.db.dynobject
        // 	.updateNative({colname: 'clubs'}, {
        // 		$set: {
        // 			'dynvars.shouldRefresh': {
        // 				type: "object",
        // 				value: {
        // 					activeMembers: false,
        // 					clubData: false
        // 				}
        // 			}
        // 		}
        // 	})
        // 	.then(() => ({ok: true}));
        default:
            return Promise.resolve({ ok: true });
    }
};
