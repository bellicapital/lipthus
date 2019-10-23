"use strict";
const fs = require('fs');
module.exports = function DsResponseTest(req, res, next) {
    fs.readFile(req.site.srcDir + '/dsresponse_log.json', 'utf8', (err, data) => {
        if (err)
            return next(err);
        data = JSON.parse(data);
        res.locals.json = data;
        const params = JSON.parse(Buffer.from(data.post.Ds_MerchantParameters, 'base64').toString());
        params.Ds_Date = decodeURIComponent(params.Ds_Date);
        params.Ds_Hour = decodeURIComponent(params.Ds_Hour);
        res.locals.params = JSON.stringify(params, null, '\t');
        res.htmlPage
            .init({
            pageTitle: "DsResponse Test page",
            view: 'dsresponsetest',
            layout: 'admin'
        })
            .then(p => p.addCSS('form.css').send())
            .catch(next);
    });
};
