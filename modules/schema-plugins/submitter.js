"use strict";

const mongoose = require('mongoose');

module.exports = function submitterPlugin(schema){
	schema.add({submitter: {type: mongoose.Schema.Types.ObjectId, ref: 'user' }});
};