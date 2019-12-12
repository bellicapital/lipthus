"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const geoip = require('geoip-lite');
class IpLocation {
    constructor(a) {
        if (!a)
            return;
        if (a instanceof String) {
            this.setIp(a);
        }
        else if (a.get)
            this.setIp(a.get('X-Forwarded-For') || a.ip);
        else if (typeof a === 'object')
            this.setParams(a);
    }
    setIp(ip) {
        this.ip = ip.split(':').slice(-1)[0]; // ipv6 filter
        return this.lookup();
    }
    setParams(a) {
        Object.each(a, (k, v) => this[k] = v);
        return this;
    }
    lookup() {
        const geo = geoip.lookup(this.ip);
        if (geo)
            this.setParams(geo);
        // debug(geoip.pretty(geo.range[0]), geoip.pretty(geo.range[1]))
        return this;
    }
    toString(sep) {
        if (!this.ip)
            return '';
        const ret = [];
        if (this.city)
            ret.push(this.city);
        if (this.region && isNaN(this.region))
            ret.push(this.region);
        if (!ret.length && this.country)
            ret.push(this.country);
        ret.push(this.ip);
        return ret.join(sep || ' · ');
    }
}
exports.IpLocation = IpLocation;
