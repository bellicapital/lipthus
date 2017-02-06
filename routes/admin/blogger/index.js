"use strict";

const express = require('express');

module.exports = app => {
	const router = express.Router({strict: true});

	router.get('/:schema/:id/img\\-:imgidx', require('./img'));
	router.get('/:schema/:id/edit', require('./form'));
	router.get('/:schema', require('./list'));
	router.get('/', require('./home'));

	app.use('/blogger', router);
};