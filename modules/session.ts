import {Site} from "./site";
import {NextFunction} from "express";
import {LipthusRequest, LipthusResponse} from "../typings/lipthus";

const s = require('express-session');
const MongoStore = require("connect-mongo")(s);

export const session = (site: Site) => {
	site.store = new MongoStore({mongooseConnection: site.db._conn});
	
	const params = {
		secret: site.secret,
		cookie: {
			maxAge: 60000 * 60 * 24 * 5 // cinco dias
		},
		store: site.store,
		name: site.key + ".sid",
		resave: false,
		saveUninitialized: false,
		unset: 'destroy'
	};
	
	const sessionMW = s(params);
	
	return (req: LipthusRequest, res: LipthusResponse, next: NextFunction) => {
		if (req.device.type === 'bot') {
			req.session = {};
			
			return next();
		}
		
		sessionMW(req, res, next);
	};
};
