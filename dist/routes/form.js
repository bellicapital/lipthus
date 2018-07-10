"use strict";

const EucaForm = require('../modules/form');

module.exports = (req, res) => {
	EucaForm.processReq(req)
		.then(r => res.json(r))
		.catch(err => {
			res.json({error: err.message || err});

			console.error(err);
		});
};