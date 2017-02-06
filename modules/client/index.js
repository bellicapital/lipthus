"use strict";

const geo = require('../geo');
const ipLocation = geo.ipLocation;
const GeoIp = geo.geoIp;

module.exports = function(app){
	const geoip  = new GeoIp(app);

	app.request.__proto__.geoIp = function(){
		// this -> req
		geoip.lookup(this.get('x-forwarded-for') || this.connection.remoteAddress, (err, loc) => {
			cb(err, this.ipLocation_ = loc);
		});
	};
	
	return (req, res, next) => {
		Object.defineProperty(req, 'ipLocation', {get: () => {
			if(req.ipLocation_)
				return req.ipLocation_;

			const ipl = ipLocation(req);

			Object.defineProperty(req, 'ipLocation_', {value: ipl});

			return ipl;
		}});
		
		next();
	};
};