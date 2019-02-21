import { LipthusRequest } from "../index";
import { KeyString } from "../interfaces/global.interface";

export class AjaxGlobalMethods {

	constructor(public req: LipthusRequest) {
	}

	main(): Promise<any> {
		const req = this.req;
		const site = req.site;
		const ret: any = {
			sitename: site + '',
			registerMethods: site.registerMethods
		};

		return req.ml.langUserNames()
			.then(ln => ret.languages = ln)
			.then(() => this.req.getUser()
				.then((user: any) => ret.user = user && user.baseInfo())
			)
			.then(() => {
				if (site.environment.VAPID)
					ret.publicKey = site.environment.VAPID.publicKey;

				return ret;
			});
	}

	// noinspection JSUnusedGlobalSymbols
	setConfig(name: string, value: any, ns: string) {
		return this.req.site.config.set(name, value, ns, true);
	}

	// noinspection JSUnusedGlobalSymbols
	loginInfo(): Promise<LoginInfo> {
		return this.req.ml.load('ecms-user')
			.then(() => this.main())
			.then((ret: any) => {
				ret = <LoginInfo>ret;

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
		const devices = this.req.user!.devices || [];
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

		return this.req.user!.set('devices', devices)
			.save()
			.then(() => ({ok: true}));
	}
}

export default AjaxGlobalMethods;

export interface LoginInfo {
	LC: KeyString;
	user: any;
	msg?: string;
	registerMethods: {
		site: boolean;
		google: boolean;
		fecebook: boolean;
	};
}
