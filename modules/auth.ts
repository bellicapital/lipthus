import {LipthusRequest, LipthusResponse, Site} from "../index";
import {NextFunction} from "express";
import {Passport} from "passport";

const md5 = require('md5');
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

					site.userCollection
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
				return;

			const FacebookTokenStrategy = require('passport-facebook-token');

			passport.use(new FacebookTokenStrategy({
					clientID: config.fb_app_id,
					clientSecret: config.fb_app_secret,
					callbackURL: site.mainUrl()
				},
				(accessToken: string, refreshToken: string, profile: any, done: any) => {
					const data = profile._json;

					data.accessToken = accessToken;

					done(null, data);
				}
			));
		},

		google() {
			if (!config.googleApiKey || !config.googleSecret)
				return;

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
					// console.log(profile);
					const data: GoogleOauth2Data = profile._json;

					data.accessToken = accessToken;

					site.userCollection.fromOAuth2(data)
						.then(user => done(null, user))
						.catch(done);
				}
			));

			// GET /auth/google
			//   Use passport.authenticate() as route middleware to authenticate the
			//   request.  The first step in Google authentication will involve
			//   redirecting the user to google.com.  After authorization, Google
			//   will redirect the user back to this application at /auth/google/callback
			app.get('/auth/google', (req, res, next) => {
					(req as any).session.redirect_to = req.query.redirect_to || '';
					next();
				},
				passport.authenticate('google', {
					scope: ['openid', 'email', 'profile']
				}));

			// GET /auth/google/callback
			//   Use passport.authenticate() as route middleware to authenticate the
			//   request.  If authentication fails, the user will be redirected back to the
			//   login page.  Otherwise, the primary route function  will be called,
			//   which, in this example, will redirect the user to the home page.
			app.get('/oauth2cb', (req, res, next) =>
				(req as any).ml.load('ecms-user')
					.then((LC) => passport.authenticate('google', {
							failureRedirect: '/login/?msg=' + LC._US_REGISTERNG,
							successRedirect: (req as any).session.redirect_to || '/'
						})(req, res, next)
					)
			);
		}
	};

	Object.keys(methods).forEach(method => methods[method]());
};

export default (site: Site): any => {
	const app = site.app;

	const passport = new Passport();

	app.use(passport.initialize());
	app.use(passport.session());

	passport.serializeUser((user: any, done: any) => done(null, user._id.toString()));

	passport.deserializeUser((id: any, done: any) => done(null, id));

	Object.defineProperty(app, 'passport', {value: passport});

	registerSiteStrategies(site, passport);

	/**
	 * @todo: add getUser in req.constructor.prototype
	 */
	return (req: LipthusRequest, res: LipthusResponse, next: NextFunction) => {
		req.getUser = async () => {
			if (req.user && req.user.constructor.name !== 'model' && mongoose.Types.ObjectId.isValid(req.user))
				req.user = await req.site.userCollection.findById(req.user);

			return req.user;
		};

		next();
	};
};

export interface GoogleOauth2Data {
	kind?: string;
	etag?: string;
	sub?: string;
	id?: string;
	name?: string;
	displayName?: string;
	given_name?: string;
	family_name?: string;
	profile?: string; // url
	picture?: string;	// url
	image?: { url: string, isDefault: boolean };
	email?: string;
	emails?: Array<{ value: string; type: string }>;
	email_verified?: boolean;
	gender?: string;
	locale?: string;
	language?: string;
	accessToken?: string;
}
