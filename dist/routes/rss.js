"use strict";
// http://cyber.law.harvard.edu/rss/rss.html#syndic8
/**
 * @link https://www.npmjs.com/package/rss
 * @type RSS
 */
const RSS = require('rss');
const rssMap = {};
module.exports = function (app) {
    const s = app.db.schemas;
    Object.each(s, (k, v) => {
        if (v.get('rss')) {
            const baseurl = v.get('baseurl') || k;
            app.get('/rss/' + baseurl + '.xml', route);
            rssMap[baseurl] = k;
        }
    });
};
function route(req, res, next) {
    const param = req.path.replace(/^\/rss\/(.+)\.xml$/, '$1');
    const col = rssMap[param];
    const model = req.db[col];
    if (!model)
        return next();
    const lang = req.ml.lang;
    const title = model.schema.get('title');
    const description = model.schema.get('description');
    const host = 'http://' + req.headers.host;
    model.find({ active: true }).sort({ created: -1 }).exec(function (err, r) {
        const feed = new RSS({
            title: title && title[lang],
            description: description && description[lang],
            feed_url: host + '/rss/' + col + '.xml',
            site_url: host,
            image_url: req.site.logo(150, 150).uri,
            copyright: new Date().getFullYear() + ' ' + req.site,
            language: lang,
            pubDate: r && r[0].created,
            ttl: '60'
        });
        r.forEach(function (item) {
            const fitem = {
                title: item.title && item.title[lang] || item.title,
                description: '',
                url: item.getLink(req),
                guid: item.id,
                date: item.created
            };
            if (item.image) {
                const img = item.image.getThumb(600, 600, false);
                if (img)
                    fitem.description += '<img src="' + host + img.uri + '">';
            }
            if (item.description)
                fitem.description += item.description[lang] || item.description;
            feed.item(fitem);
        });
        const xml = feed.xml().replace('<?xml version="1.0" encoding="UTF-8"?>', '<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="' + host + '/cms/xsl/es/rss.xsl"?>');
        res.set('Content-Type', 'application/rss+xml').send(xml);
    });
}
