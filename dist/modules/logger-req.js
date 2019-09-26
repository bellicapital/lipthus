"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const morgan = require("morgan");
function default_1(req, res, next) {
    const timers = {
        all: { start: res.now },
        lipthus: { start: res.now }
    };
    res.timer = {
        start: (k) => timers[k] = { start: Date.now() },
        end: (k, log) => {
            const ret = timers[k].time || (timers[k].time = Date.now() - timers[k].start);
            if (log)
                console.log('Timer ' + k + ': ' + ret);
            return ret;
        },
        json: () => {
            const ret = {};
            Object.keys(timers).forEach(k => ret[k] = res.timer.end(k));
            return ret;
        },
        toString: () => JSON.stringify(res.timer.json())
    };
    const logReqClients = req.app.wss.getClients('/log-req');
    if (logReqClients.length) {
        const logReq = {
            url: req.protocol + '://' + req.get('host') + req.originalUrl,
            agent: req.get('user-agent')
        };
        if (req.method !== 'GET')
            logReq.url += ' ' + req.method;
        req.app.wss.broadcast(logReq, '/log-req');
    }
    if (process.env.NODE_ENV !== 'development') {
        next();
    }
    else {
        morgan.token('timers', () => timers.render ? res.timer : ' ');
        // morgan.token('device', () => req.device.type);
        morgan(':method :req[Host]:url :status :response-time ms :res[content-length] :timers')(req, res, function () {
            /*
        morgan(':method :req[Host]:url :status :response-time ms :res[content-length] :device :timers')(req, res, function(){
            res.logreq = {
                host: req.get('host'),
                url: req.originalUrl,
                method: req.method,
                created: new Date,
                agent: req.get('user-agent'),
                referer: req.get('referer'),
                initmem: process.memoryUsage()
            };

            req.app.wss.broadcast(res.logreq, '/logreq');
            */
            next();
        });
    }
}
exports.default = default_1;
