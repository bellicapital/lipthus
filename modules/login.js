"use strict";


module.exports = exports = {
	facebook(){
		return Promise.resolve('guapo');
	},

	google(){
		return Promise.resolve('guapo');
	},

	db(params){
		const req = this.req;

		if(req.method !== 'POST')
			throw new Error('Method should be POST');

		req.body.username = params.username || params.email;
		req.body.password = params.password;

		return exports.authenticate.call(this, 'local');
	},

	authenticate(type){
		const req = this.req;
		const app = req.app;

		return new Promise((ok, ko) => {
			app.passport.authenticate(type, (err, user, info) => {
				if (err)
					return ko(err);

				if (!user)
					return ok(info);

				if(req.session.cart)
					user.set('cart', req.app.getModule('shopping/shoppingcart').getClientCart(req).data4save());

				user.save()
					.then(() => {
						req.logIn(user, err => {
							if (err)
								return ko(err);

							const fields = {
								id: user._id,
								uname: user.uname,
								name: user.name,
								level: user.level,
								isAdmin: user.level > 1
							};
							const pFields = req.body.fields;
							const data = req.body.data;
							const sid = req.body.sid;
							let i;

							if (pFields)
								Object.keys(pFields).forEach(i => fields[i] = user[pFields[i]]);

							if (data && user.data)
								Object.keys(data).forEach(i => fields.data[i] = user.data[data[i]]);

							if (sid)
								fields.sid = 'connect.sid=s:A' + require('cookie-signature').sign(req.sessionID, req.site.secret);

							return ok(fields);
						});
					})
					.catch(ko);
			})(req, req.res, req.next);
		});
	}
};