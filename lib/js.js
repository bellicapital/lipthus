// en desarrollo...

"use strict";

const fs = require('fs');
const express = require('express');

const js = (req, res, next) => {
	
};

module.exports = express.Router({strict: true})
	.get('/:loc/:device/:key.js', js)
	.get('/:combined.:mtime.js', js);