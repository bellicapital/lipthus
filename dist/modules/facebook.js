"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Facebook = require('facebook-node-sdk');
class FB extends Facebook {
    constructor(appId, secret) {
        super({});
        this.appId = appId;
        this.secret = secret;
    }
    activate(req) {
        if (!this.appId)
            return console.error('Facebook: no appId');
        req.res.htmlPage
            .addJSVars({ fb: { appId: this.appId } })
            .addJS('facebook/fb.js', { priority: 30 })
            .addCSS('facebook', 25);
    }
}
exports.default = (app) => {
    app.set('fb', new FB(app.site.config.fb_app_id, app.site.config.fb_app_secret));
};
