import {LipthusRequest} from "../index";

const Facebook = require('facebook-node-sdk');

class FB extends Facebook {
	constructor(appId: string, secret: string) {
		super({});
		this.appId = appId;
		this.secret = secret;
	}

	activate(req: LipthusRequest) {
		if (!this.appId)
			return console.error('Facebook: no appId');

		req.res.htmlPage
			.addJSVars({fb: {appId: this.appId}})
			.addJS('facebook/fb.js', {priority: 30})
			.addCSS('facebook', 25);
	}
}

export default (app: any) => {
	app.set('fb', new FB(app.site.config.fb_app_id, app.site.config.fb_app_secret));
};
