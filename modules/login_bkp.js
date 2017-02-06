"use strict";

const validator = require("email-validator");

module.exports = {
	register: (req, res, next) => {
		const p = req.body;

		if(!p.pass)
			return next(new Error('No password'));

		if(!p.email)
			return next(new Error('No email provided'));

		p.email = p.email.trim();

		if(p.uname)
			p.uname = p.uname.trim();

		if(!validator.validate(p.email))
			return next(new Error('Invalid email'));

		req.ml
			.load('ecms-user')
			.then(() => {
				const lc = req.ml.all;

				function checkExists(cb){
					req.db.user
						.findOne({email: p.email})
						.then(user => {
							if(user)
								return next(new Error(lc._US_EMAILTAKEN));

							if(!p.uname)
								return cb();

							req.db.user.findOne({uname: p.uname}, function(err, user){
								if(err)
									return next(err);

								if(user)
									return next(new Error(lc._US_NICKNAMETAKEN));
							});
						})
						.catch(cb);
				}

				checkExists(err => {
					if(err)
						return next(err);

					const user = new req.db.user();

					user.set('uname', p.uname);
					user.set('name', p.name.trim());
					user.set('email', p.email);
					user.set('pass', p.pass.trim());//auto md5 in schema
					user.set('language', req.ml.lang);

					if(p.phone)
						user.set('phone', p.phone);

					if(req.session.cart)
						user.set('cart', require('./shopping/shoppingcart').getClientCart(req).data4save());

					const site = req.site;

					if(site.config.activation_type === 1)
						user.set('level', 1);

					user.save(function(err){
						if(err)
							return next(err);

						const json = {id: user._id, uname: user.uname, name: user.name, level: user.level, isAdmin: user.level > 1};

						//email de confirmación
						if(user.level > 0){
							site.notifier.toEmail({
								to: user.email,
								subject: req.ml.all._WELCOMETO.replace('%s', site.config.sitename),
								lang: user.language,
								body: {X_UNAME: user.getName(true)},
								tpl: 'welcome'
							});

							req.logIn(user, function(err){
								next(err, json);
							});
						} else
							next(null, json);
					});
				});
			})
			.catch(next);
	}
};