import {Site} from "./site";
import {NextFunction} from "express";
import {LipthusRequest, LipthusResponse} from "../index";

const session = require('express-session');
const MongoDBStore = require("connect-mongodb-session")(session);

export default (site: Site) => {
	const {uri, options} = site.authDb.connectParams();
	const expires = 1000 * 60 * 60 * 24 * 14; // 2 weeks

	site.store = new MongoDBStore({
		uri: uri,
		connectionOptions: options,
		collection: 'sessions',
		expires: expires
	});
	
	const params = {
		secret: site.secret,
		cookie: {
			maxAge: expires
		},
		store: site.store,
		name: site.key + ".sid",
		resave: false,
		saveUninitialized: false,
		unset: 'destroy'
	};
	
	const sessionMW = session(params);
	
	return (req: LipthusRequest, res: LipthusResponse, next: NextFunction) => {
		if (req.device.type === 'bot') {
			req.session = {};
			
			return next();
		}
		
		sessionMW(req, res, next);
	};
};
