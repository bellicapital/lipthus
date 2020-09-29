"use strict";
const ip_location_1 = require("./geo/ip-location");
module.exports = function () {
    return (req, res, next) => {
        Object.defineProperty(req, 'ipLocation', {
            get: () => {
                if (req.ipLocation_)
                    return req.ipLocation_;
                const ipl = new ip_location_1.IpLocation(req);
                req.ipLocation_ = ipl;
                return ipl;
            }
        });
        next();
    };
};
