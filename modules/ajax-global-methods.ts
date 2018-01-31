export class AjaxGlobalMethods {
	constructor(public req: any) {
	}
	
	main() {
		const req = this.req;
		const config = req.site.config;
		
		return req.ml.langUserNames()
			.then((ln: any) => ({
				sitename: req.site + '',
				languages: ln,
				user: req.user && req.user.baseInfo() || undefined,
				registerMethods: {
					site: config.site_credentials,
					google: config.googleApiKey && !!config.googleSecret,
					facebook: !!config.fb_app_id
				}
			}));
	}
	
	// noinspection JSUnusedGlobalSymbols
	setConfig(name: string, value: any, ns: string) {
		return this.req.site.config.set(name, value, ns, true);
	}
	
	// noinspection JSUnusedGlobalSymbols
	loginInfo() {
		return this.req.ml.load('ecms-user')
			.then(() => this.main())
			.then((ret: any) => {
				if (ret.user)
					ret.msg = 'Ya estás logueado como ' + ret.user.name;
				
				const keys = [
					'_US_LOGIN',
					'_US_USERNAME',
					'_US_EMAIL',
					'_US_PASSWORD',
					'_US_NOTREGISTERED',
					'_US_LOSTPASSWORD',
					'_US_NOPROBLEM',
					'_US_SENDPASSWORD'
				];
				
				const LC = this.req.ml.all;
				
				ret.LC = {};
				
				keys.forEach(k => ret.LC[k] = LC[k]);
				
				return ret;
			});
	}
	
	// noinspection JSUnusedGlobalSymbols
	storeFcmToken(params: any) {
		const devices = this.req.user.devices || [];
		const device = devices.find((d: any) => d.uuid === params.uuid || d.regId === params.regId);
		
		if (device) {
			if (device.regId === params.regId)
				return {ok: true};
			
			device.regId = params.regId;
		} else {
			if (!params.platform)
				params.platform = this.req.device.type;
			
			if (!params.title)
				params.title = this.req.device.name;
			
			if (!params.version)
				params.version = this.req.headers.userAgent;
			
			devices.push(params);
		}
		
		return this.req.user.set('devices', devices)
			.save()
			.then(() => ({ok: true}));
	}
}

export default AjaxGlobalMethods;
