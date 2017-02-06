"use strict";

const methods =
module.exports = {
	main(){
		const req = this.req;

		return req.ml.langUserNames()
			.then(ln => ({
				sitename: req.site + '',
				languages: ln,
				user: req.user && req.user.baseInfo() || undefined
			}));
	},

	setConfig(name, value, ns){
		const req = this.req;

		return req.site.config.set(name, value, ns, true);
	},

	resetUserNoti(){
		const req = this.req;

		return req.db.notification
			.update({uid: req.user, seen: {$ne: true}}, {$set: {seen: true}}, {multi: true})
			.exec();
	},

	loginInfo(){
		return this.req.ml.load('ecms-user')
			.then(() => methods.main.call(this))
			.then(ret => {
				if(ret.user)
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
};