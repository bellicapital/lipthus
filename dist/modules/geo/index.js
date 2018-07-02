"use strict";

const eucalocation = require('./location');
const geoIp = require('./geoip');
const ipLocation = require('./iplocation');

module.exports = {
	location: eucalocation,
	ipLocation: ipLocation,
	geoIp: geoIp
};