"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const img_1 = require("./img");
const form_1 = require("./form");
const list_1 = require("./list");
const home_1 = require("./home");
module.exports = (app) => {
    const router = express_1.Router({ strict: true });
    router.get('/:schema/:id/img\\-:imgidx', img_1.bloggerImage);
    router.get('/:schema/:id/edit', form_1.bloggerForm);
    router.get('/:schema', list_1.bloggerList);
    router.get('/', home_1.bloggerHome);
    app.use('/blogger', router);
};
