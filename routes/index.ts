import {LipthusApplication, LipthusRequest, LipthusResponse} from "../index";
import {NextFunction, Router} from "express";
import {fsRoute} from "./fs";
import info from "./info";
import {Setup} from "./setup";
import {userPage} from "./user";
import {existsSync} from "fs";
import {tmpdir} from "os";
import * as multer from "multer";
import notfoundmin from "./notfoundmin";

const bdf = require('./bdf');
const thumb = require('./thumb');
const video = require('./video');
const videos = require('./videos');
const embed = require('./embed');
const ajax = require('./ajax');
const upload = require('./upload');
const form = require('./form');
const multipart = multer({ dest: tmpdir() }).any();

const uLevelMiddleware = (level: number) => (req: LipthusRequest, res: LipthusResponse, next: NextFunction) => {
	req.getUser()
		.then(u => {
			if (!u || u.level < level)
				return next(403);

			next();
		});
};

module.exports = function(app: LipthusApplication) {
	const router = Router({strict: true});

	// ...  as any hasta que implememntemos router
	router.post('/ngsetup/:method', uLevelMiddleware(2) as any, Setup as any);
	router.get('/bdf/:col/:id/:field/:p/:name', bdf);
	router.get('/bdf/:col/:id/:field/:name', bdf);
	router.get('/bdf/:col/:id/:field', bdf);
	router.get('/bdf/*', notfoundmin as any);
	router.get('/fs/:id', fsRoute as any);
	router.get('/fs/:id/:fn', fsRoute as any);
	router.get('/fs/*', notfoundmin as any);
	router.get('/video/:id', video);
	router.get('/videos/:id', videos);
	router.get('/videos/:id/:type*', videos);
	router.get('/embed/:id', embed);
	router.get('/thumbs/:id\\_:width\\_:height\\_:crop:nwm?.png', thumb);
	// router.get('/thumbs/:schema/:id/:field\\_:width\\_:height\\_:crop:nwm?.png', thumb);

	require('./admin')(app, router);
	require('./config')(app);

	router.all('/ajax', ajax);
	router.post('/upload', multipart, upload);
	router.post('/form/:schema/:itemid/:cmd', form);
	router.get('/form/:schema/:itemid/get', form);
	router.all('/form/:schema/:cmd', form);
	router.get('/info/:method', info as any);
	router.all('/users/:uid', userPage);
	router.all('/subscriptions/:action', require('./subscriptions'));
	router.get('/users/:uid/subscriptions', require('./user-subscriptions'));

	router.get('/lmns/:schema/:id', require('./lmns'));

	const dir = app.get('dir');
	router.all('/unsubscribe', require(existsSync(dir + '/routes/unsubscribe.js') ? dir + '/routes/unsubscribe' : './unsubscribe'));

	router.all('/videouploader', multipart, require('./videouploader'));
	router.get('/resimg/:p', require('./resimg'));
	router.get('/optimg/:fn', require('./optimg'));
	router.get('/c/:id/:name', require('./cache')); // @deprecated
	router.get('/c/:id.:ext*', require('./cache'));
	router.post('/paypalresponse', require('./paypalresponse'));
	router.all('/dsresponse', require('./dsresponse'));
	router.get('/dsresponsetest', require('./dsresponsetest'));
	router.get('/notifications', require('./notifications'));
	router.get('/comments', require('./comments-mng'));
	router.get('/comments/:col', require('./comments-mng'));
	router.post('/comments/:col', require('./comments-mng-post'));
	router.get('/item-comments/:schema/:itemid', require('./item-comments'));
	router.get('/logout', require('./logout'));
	// require('./login')(app);

	require('./rss')(app);

	app.use('/', router);
};
