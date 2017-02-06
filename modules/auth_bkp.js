"use strict";

const Passport = require('passport').Passport;
const md5 = require('md5');

const registerSiteStrategies = site => {
	const app = site.app;
	const passport = app.passport;
	const config = site.config;

	const methods = {
		site(){
			const LocalStrategy = require('passport-local').Strategy;

			passport.use(new LocalStrategy(
				(username, password, done) => {
					const query = {};

					if (/.+@.+\.\w+/.test(username))
						query.email = username;
					else
						query.uname = username;

					site.db.user
						.findOne(query)
						.then(user => {
							if (!user)
								return done(null, false, {message: 'Incorrect username.'});

							if (md5(password) !== user.pass)
								return done(null, false, {message: 'Incorrect password.'});

							return done(null, user);
						})
						.catch(done);
				}
			));

			app.use((req, res, next) => {
				if (req.body.doLogin !== 'true')
					return next();

				passport.authenticate('local', (err, user, info) => {
					if (user && !info) {
						req.logIn(user, () => next());
					} else {
						if (info && info.message) {
							req.userLoginMsg = info.message;
							delete req.user;
						}

						next();
					}
				})(req, res, next);
			});
		},

		facebook(){
			if (!config.fb_app_id)
				return console.warn('Facebook auth failed. No app id provided.');

			const FacebookTokenStrategy = require('passport-facebook-token');

			passport.use(new FacebookTokenStrategy({
					clientID: config.fb_app_id,
					clientSecret: config.fb_app_secret,
					callbackURL: site.mainUrl()
				},
				(accessToken, refreshToken, profile, done) => {
					const data = profile._json;

					data.token = {value: accessToken};
					done(null, data);
				}
			));
		},

		google(){
			if (!config.googleApiKey)
				return console.warn('Google auth failed. No app id provided.');

			if (!config.googleSecret)
				return console.warn('Google auth failed. No secret key provided.');

			const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

			//   Strategies in Passport require a `verify` function, which accept
			//   credentials (in this case, an accessToken, refreshToken, and Google
			//   profile), and invoke a callback with a user object.
			passport.use(new GoogleStrategy({
					clientID: config.googleApiKey,
					clientSecret: config.googleSecret,
					callbackURL: site.mainUrl() + '/oauth2cb'
				},
				(accessToken, refreshToken, profile, done) => {
					const data = profile._json;

					data.token = {value: accessToken};
					done(null, data);
				}
			));

			// GET /auth/google
			//   Use passport.authenticate() as route middleware to authenticate the
			//   request.  The first step in Google authentication will involve
			//   redirecting the user to google.com.  After authorization, Google
			//   will redirect the user back to this application at /auth/google/callback
			app.get('/auth/google',
				passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login'] }));

			// GET /auth/google/callback
			//   Use passport.authenticate() as route middleware to authenticate the
			//   request.  If authentication fails, the user will be redirected back to the
			//   login page.  Otherwise, the primary route function function will be called,
			//   which, in this example, will redirect the user to the home page.
			app.get('/oauth2cb',
				passport.authenticate('google', { failureRedirect: '/login' }),
				(req, res) => res.redirect('/')
			);
		}
	};

	config.register_methods.forEach(method => methods[method]());
};

module.exports = site => {
	const app = site.app;

	const passport = new Passport();

	app.use(passport.initialize());
	app.use(passport.session());

	passport.serializeUser((user, done) => done(null, user.id));

	passport.deserializeUser((id, done) => done(null, id));

	Object.defineProperty(app, 'passport', {value: passport});

	registerSiteStrategies(site);

	return (req, res, next) => {
		if(req.isAuthenticated()) {
			return site.db.user
				.findById(req.user)
				.then(user => {
					if (user)
						req.User = user;
					else
						delete req.user;

					next();
				})
				.catch(next);
		}

		// if(!site.config.adminmail)
		// 	return require('./install')(req, res, next);

		next();
	};
};

module.exports.registerSiteStrategies = registerSiteStrategies;