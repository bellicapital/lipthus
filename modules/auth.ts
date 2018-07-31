import {LipthusRequest, LipthusResponse, Site} from "../index";
import {NextFunction} from "express";
import {Passport} from "passport";

const md5 = require('md5');
const debug = require('debug')('site:auth');
const mongoose = require('mongoose');

const registerSiteStrategies = (site: Site, passport: any) => {
	const app = site.app;
	const config = site.config;
	const methods: any = {
		site() {
			const LocalStrategy = require('passport-local').Strategy;

			passport.use(new LocalStrategy(
				(username: string, password: string, done: any) => {
					const query: any = {};

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

			app.use((req: LipthusRequest, res: LipthusResponse, next: NextFunction) => {
				if (req.body.doLogin !== 'true')
					return next();

				passport.authenticate('local', (err: Error, user: any, info: any) => {
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

		facebook() {
			if (!config.fb_app_id)
				return debug('Facebook auth failed. No app id provided.');

			const FacebookTokenStrategy = require('passport-facebook-token');

			passport.use(new FacebookTokenStrategy({
					clientID: config.fb_app_id,
					clientSecret: config.fb_app_secret,
					callbackURL: site.mainUrl()
				},
				(accessToken: string, refreshToken: string, profile: any, done: any) => {
					const data = profile._json;

					data.token = {value: accessToken};

					done(null, data);
				}
			));
		},

		google() {
			if (!config.googleApiKey)
				return debug('Google auth failed. No app id provided.');

			if (!config.googleSecret)
				return debug('Google auth failed. No secret key provided.');

			const GoogleStrategy = require('passport-google-oauth2').Strategy;

			//   Strategies in Passport require a `verify` function, which accept
			//   credentials (in this case, an accessToken, refreshToken, and Google
			//   profile), and invoke a callback with a user object.
			passport.use(new GoogleStrategy({
					clientID: config.googleApiKey,
					clientSecret: config.googleSecret,
					callbackURL: site.mainUrl() + '/oauth2cb'
				},
				(accessToken: string, refreshToken: string, profile: any, done: any) => {
					const data = profile._json;

					data.token = {value: accessToken};
					data.email = profile.email;

					site.db.user.fromOAuth2(data)
						.then(user => done(null, user))
						.catch(done);
				}
			));

			// GET /auth/google
			//   Use passport.authenticate() as route middleware to authenticate the
			//   request.  The first step in Google authentication will involve
			//   redirecting the user to google.com.  After authorization, Google
			//   will redirect the user back to this application at /auth/google/callback
			app.get('/auth/google',
				passport.authenticate('google', {
					scope: [
						'https://www.googleapis.com/auth/plus.login',
						'https://www.googleapis.com/auth/plus.profile.emails.read'
					]
				}));

			// GET /auth/google/callback
			//   Use passport.authenticate() as route middleware to authenticate the
			//   request.  If authentication fails, the user will be redirected back to the
			//   login page.  Otherwise, the primary route function  will be called,
			//   which, in this example, will redirect the user to the home page.
			app.get('/oauth2cb', clearCookiesMiddleware as any,
				passport.authenticate('google', {
					failureRedirect: '/login',
					successRedirect: '/'
				})
			);
		}
	};

	Object.keys(methods).forEach(method => methods[method]());
};

const getUser = (req: LipthusRequest) => {
	if (!req.user || req.user.constructor.name === 'model')
		return Promise.resolve(req.user);

	if (mongoose.Types.ObjectId.isValid(req.user))
		return req.site.db.user
			.findById(req.user)
			.then((user: any) => req.user = user);

	console.warn('Unknown user id format:', req.user);

	return Promise.resolve();
};

const clearCookiesMiddleware = (req: LipthusRequest, res: LipthusResponse, next: NextFunction) => {
	Object.keys(req.cookies).filter(k => k !== 'clubmanager.sid').forEach((k => res.clearCookie(k)));

	next();
};

export = (site: Site): any => {
	const app = site.app;

	const passport = new Passport();

	app.use(passport.initialize());
	app.use(passport.session());

	passport.serializeUser((user: any, done: any) => done(null, user.id));

	passport.deserializeUser((id: any, done: any) => done(null, id));

	Object.defineProperty(app, 'passport', {value: passport});

	registerSiteStrategies(site, passport);

	/**
	 * @todo: add getUser in req.constructor.prototype
	 */
	return (req: LipthusRequest, res: LipthusResponse, next: NextFunction) => {
		req.getUser = getUser.bind(null, req);

		next();
	};
};
