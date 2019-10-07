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
import cache from "./cache";
import bdf from "./bdf";
import {AjaxMiddleware} from "./ajax";
import thumb from "./thumb";
import form from "./form";
import video from "./video";
import optimg from "./optimg";
import logout from "./logout";
import videos from "./videos";
import videoPoster from "./video-poster";
import lmns from "./lmns";
import resimg from "./resimg";
import item_comments from "./item-comments";
import logReq from "./log-req";

const embed = require('./embed');
const upload = require('./upload');
const multipart = multer({dest: tmpdir()}).any();

const uLevelMiddleware = (level: number) => async (req: LipthusRequest, res: LipthusResponse, next: NextFunction) => {
	if (level) {
		const u = await req.getUser();

		if (!u || u.level < level)
			return next(403);
	}

	next();
};

export default async function (app: LipthusApplication) {
	const router = Router({strict: true});

	// ...  as "any" hasta que implementemos router
	router.post('/ngsetup/:method', uLevelMiddleware(2) as any, Setup as any);
	router.get('/log-req', uLevelMiddleware(app.site.config.logReqUserLevel) as any, logReq as any);
	router.get('/bdf/:col/:id/:field/:p/:name', bdf as any);
	router.get('/bdf/:col/:id/:field/:name', bdf as any);
	router.get('/bdf/:col/:id/:field', bdf as any);
	router.get('/bdf/*', notfoundmin as any);
	router.get('/fs/:id', fsRoute as any);
	router.get('/fs/:id/:fn', fsRoute as any);
	router.get('/fs/*', notfoundmin as any);
	router.get('/video/:id', video as any);
	router.get('/videos/:id', videos);
	router.get('/videos/:id/:type*', videos);
	router.get('/video-poster/:db/:fn', videoPoster);
	router.get('/video-poster/:fn', videoPoster);
	router.get('/embed/:id', embed);
	router.get('/thumbs/:id\\_:width\\_:height\\_:crop:nwm?.png', thumb as any);
	// router.get('/thumbs/:schema/:id/:field\\_:width\\_:height\\_:crop:nwm?.png', thumb);

	require('./admin')(app, router);
	require('./config')(app);

	router.all('/_test/:method', require('./test'));

	router.all('/ajax', AjaxMiddleware as any);
	router.post('/upload', multipart, upload);
	router.post('/form/:schema/:itemid/:cmd', form as any);
	router.get('/form/:schema/:itemid/get', form as any);
	router.all('/form/:schema/:cmd', form as any);
	router.get('/info/:method', info as any);
	router.all('/users/:uid', userPage);
	router.all('/subscriptions/:action', require('./subscriptions'));
	router.get('/users/:uid/subscriptions', require('./user-subscriptions'));

	router.get('/lmns/:schema/:id', lmns as any);

	const dir = app.get('dir');
	router.all('/unsubscribe', require(existsSync(dir + '/routes/unsubscribe.js') ? dir + '/routes/unsubscribe' : './unsubscribe'));

	router.get('/resimg/*', resimg as any);
	router.get('/optimg/:fn', optimg as any);
	router.get('/c/:id.:ext*', cache as any);
	router.post('/paypalresponse', require('./paypalresponse'));
	router.all('/dsresponse', require('./dsresponse'));
	router.get('/dsresponsetest', require('./dsresponsetest'));
	router.get('/notifications', require('./notifications'));
	router.get('/comments', require('./comments-mng'));
	router.get('/comments/:col', require('./comments-mng'));
	router.post('/comments/:col', require('./comments-mng-post'));
	router.get('/item-comments/:schema/:itemid', item_comments as any);
	router.get('/logout', logout as any);
	// require('./login')(app);

	require('./rss')(app);

	// local routes
	const path_ = app.get('dir') + '/routes';

	if (existsSync(path_))
		await require(path_)(app);

	app.use('/', router);
}
