"use strict";
const morgan = require("morgan");
module.exports = function (req, res, next) {
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
    morgan.token('timers', () => timers.render ? res.timer : ' ');
    // @ts-ignore
    morgan(':method :req[Host]:url :status :response-time ms :res[content-length] :timers')(req, res, next);
};
