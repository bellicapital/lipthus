"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = require("./fs");
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
const video_poster_1 = require("./video-poster");
const lmns_1 = require("./lmns");
const resimg_1 = require("./resimg");
const embed = require('./embed');
const upload = require('./upload');
const multipart = multer({ dest: os_1.tmpdir() }).any();
async function default_1(app) {
    const router = express_1.Router({ strict: true });
    // ...  as "any" hasta que implementemos router
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
    router.get('/video-poster/:db/:fn', video_poster_1.default);
    router.get('/video-poster/:fn', video_poster_1.default);
    router.get('/embed/:id', embed);
    router.get('/thumbs/:id\\_:width\\_:height\\_:crop:nwm?.png', thumb_1.default);
    // router.get('/thumbs/:schema/:id/:field\\_:width\\_:height\\_:crop:nwm?.png', thumb);
    router.all('/_test/:method', require('./test'));
    router.all('/ajax', ajax_1.AjaxMiddleware);
    router.post('/upload', multipart, upload);
    router.post('/form/:schema/:itemid/:cmd', form_1.default);
    router.get('/form/:schema/:itemid/get', form_1.default);
    router.all('/form/:schema/:cmd', form_1.default);
    router.all('/users/:uid', user_1.userPage);
    router.all('/subscriptions/:action', require('./subscriptions'));
    router.get('/lmns/:schema/:id', lmns_1.default);
    const dir = app.get('dir');
    router.all('/unsubscribe', require(fs_2.existsSync(dir + '/routes/unsubscribe.js') ? dir + '/routes/unsubscribe' : './unsubscribe'));
    router.get('/resimg/*', resimg_1.default);
    router.get('/optimg/*', optimg_1.default);
    router.get('/c/:id.:ext*', cache_1.default);
    router.get('/notifications', require('./notifications'));
    router.get('/logout', logout_1.default);
    router.get('/ipLocation', (req, res) => {
        res.send({
            ipLocation: req.ipLocation,
            reqIp: req.ip,
            reqIps: req.ips,
            'X-Forwarded-For': req.get('X-Forwarded-For'),
        });
    });
    // local routes
    const path_ = app.get('dir') + '/routes';
    if (fs_2.existsSync(path_))
        await require(path_)(app);
    app.use('/', router);
}
exports.default = default_1;
