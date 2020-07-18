"use strict";
module.exports = (app) => {
    app.use(async (req, res, next) => {
        const config = await app.site.db.config.findOne({ name: "logRoute" }).lean();
        app.site.config.logRoute = config.value;
        if (!app.site.config.logRoute)
            return next();
        const memoryStart = process.memoryUsage();
        const start = new Date();
        const logRoute = await app.db.logRoute.create({
            url: req.originalUrl,
            start,
            memoryStart
        });
        res.on('finish', () => {
            const memoryEnd = process.memoryUsage();
            const memoryDiff = {};
            Object.keys(memoryEnd).forEach(k => memoryDiff[k] = memoryEnd[k] - memoryStart[k]);
            logRoute.set({
                time: Date.now() - start.getTime(),
                memoryEnd,
                memoryDiff
            })
                .save();
        });
        next();
    });
};
