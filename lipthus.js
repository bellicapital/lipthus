"use strict";

const fs = require('fs');
const index = process.env.LIPTHUS_ENV === 'development' || !fs.existsSync('dist/index.js') ? './index.ts' : './dist/index';

module.exports = require(index);
