"use strict";

const mongoose = require('mongoose');

module.exports = function modifierPlugin(schema){
	schema.add({modifier: {type: mongoose.Schema.Types.ObjectId, ref: 'user' }});

	schema.methods.setModified = function(user){
		return this.set({
			modified: new Date(),
			modifier: user
		})
	}
};
