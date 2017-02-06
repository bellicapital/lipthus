"use strict";

const session = require('express-session');
const MongoStore = require("connect-mongo")(session);

module.exports = site => {
	site.store = new MongoStore({mongooseConnection: site.db._conn});

	const params = {
		secret: site.secret,
		cookie: {
			maxAge: 60000*60*24*5//cinco dias
		},
		store: site.store,
		name:"express.sid",
		resave: false,
		saveUninitialized: false,
		unset: 'destroy'
	};
   
	const sessionMW = session(params);

	return (req, res, next) => {
		if(req.device.type === 'bot'){
			req.session = {};
			
			return next();
		}

		sessionMW(req, res, next);
	};
};