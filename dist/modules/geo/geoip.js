"use strict";
class GeoIp {
    constructor(app) {
        Object.defineProperty(app, 'geoIp', {
            get: () => this
        });
        this.db = app.db;
    }
    /**
     *
     * @param ip {String}
     * @returns {*}
     */
    lookup(ip) {
        ip = ip.split(':').slice(-1)[0]; //ipv6 filter
        if (ip.indexOf('127.') === 0)
            return Promise.resolve({ ip: ip, city: 'localhost' });
        return this.db.ip.get(ip);
    }
}
module.exports = GeoIp;
