"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = require("./fs");
const info_1 = require("./info");
const setup_1 = require("./setup");
const user_1 = require("./user");
const fs_2 = require("fs");
const os_1 = require("os");
const multer = require("multer");
const notfoundmin_1 = require("./notfoundmin");
const cache_1 = require("./cache");
const bdf_1 = require("./bdf");
const ajax_1 = require("./ajax");
const thumb_1 = require("./thumb");
const form_1 = require("./form");
const video_1 = require("./video");
const optimg_1 = require("./optimg");
const logout_1 = require("./logout");
const videos_1 = require("./videos");
const lmns_1 = require("./lmns");
const resimg_1 = require("./resimg");
const item_comments_1 = require("./item-comments");
const log_req_1 = require("./log-req");
const embed = require('./embed');
const upload = require('./upload');
const multipart = multer({ dest: os_1.tmpdir() }).any();
const uLevelMiddleware = (level) => (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (level) {
        const u = yield req.getUser();
        if (!u || u.level < level)
            return next(403);
    }
    next();
});
function default_1(app) {
    return __awaiter(this, void 0, void 0, function* () {
        const router = express_1.Router({ strict: true });
        // ...  as "any" hasta que implementemos router
        router.post('/ngsetup/:method', uLevelMiddleware(2), setup_1.Setup);
        router.get('/log-req', uLevelMiddleware(app.site.config.logReqUserLevel), log_req_1.default);
        router.get('/bdf/:col/:id/:field/:p/:name', bdf_1.default);
        router.get('/bdf/:col/:id/:field/:name', bdf_1.default);
        router.get('/bdf/:col/:id/:field', bdf_1.default);
        router.get('/bdf/*', notfoundmin_1.default);
        router.get('/fs/:id', fs_1.fsRoute);
        router.get('/fs/:id/:fn', fs_1.fsRoute);
        router.get('/fs/*', notfoundmin_1.default);
        router.get('/video/:id', video_1.default);
        router.get('/videos/:id', videos_1.default);
        router.get('/videos/:id/:type*', videos_1.default);
        router.get('/embed/:id', embed);
        router.get('/thumbs/:id\\_:width\\_:height\\_:crop:nwm?.png', thumb_1.default);
        // router.get('/thumbs/:schema/:id/:field\\_:width\\_:height\\_:crop:nwm?.png', thumb);
        require('./admin')(app, router);
        require('./config')(app);
        router.all('/_test/:method', require('./test'));
        router.all('/ajax', ajax_1.AjaxMiddleware);
        router.post('/upload', multipart, upload);
        router.post('/form/:schema/:itemid/:cmd', form_1.default);
        router.get('/form/:schema/:itemid/get', form_1.default);
        router.all('/form/:schema/:cmd', form_1.default);
        router.get('/info/:method', info_1.default);
        router.all('/users/:uid', user_1.userPage);
        router.all('/subscriptions/:action', require('./subscriptions'));
        router.get('/users/:uid/subscriptions', require('./user-subscriptions'));
        router.get('/lmns/:schema/:id', lmns_1.default);
        const dir = app.get('dir');
        router.all('/unsubscribe', require(fs_2.existsSync(dir + '/routes/unsubscribe.js') ? dir + '/routes/unsubscribe' : './unsubscribe'));
        router.get('/resimg/*', resimg_1.default);
        router.get('/optimg/:fn', optimg_1.default);
        router.get('/c/:id.:ext*', cache_1.default);
        router.post('/paypalresponse', require('./paypalresponse'));
        router.all('/dsresponse', require('./dsresponse'));
        router.get('/dsresponsetest', require('./dsresponsetest'));
        router.get('/notifications', require('./notifications'));
        router.get('/comments', require('./comments-mng'));
        router.get('/comments/:col', require('./comments-mng'));
        router.post('/comments/:col', require('./comments-mng-post'));
        router.get('/item-comments/:schema/:itemid', item_comments_1.default);
        router.get('/logout', logout_1.default);
        // require('./login')(app);
        require('./rss')(app);
        // local routes
        const path_ = app.get('dir') + '/routes';
        if (fs_2.existsSync(path_))
            yield require(path_)(app);
        // site pages
        if (app.site.config.startpage && app.site.pages[app.site.config.startpage])
            router.all('/', (req, res, next) => app.site.pages[app.site.config.startpage].display(req, res, next));
        Object.values(app.site.pages).forEach(p => router.all('/' + (p.url || p.key), p.display.bind(p)));
        app.use('/', router);
    });
}
exports.default = default_1;
