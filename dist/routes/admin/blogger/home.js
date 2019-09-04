"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const blogger_1 = require("../../../modules/blogger");
function bloggerHome(req, res, next) {
    const blogger = new blogger_1.Blogger(req);
    if (req.query.reflink)
        req.session.bloggerreflink = req.query.reflink;
    if (blogger.size === 1)
        return res.redirect('/blogger/' + blogger.keys[0]);
    res.htmlPage
        .init({
        title: 'Blogger',
        sitelogo: true,
        view: 'admin/blogger/home',
        layout: 'base',
        userLevel: 2,
        userType: 'blogger'
    })
        .then(() => {
        res.locals.reflink = req.session.bloggerreflink || "/";
        if (!blogger.size)
            res.htmlPage.send();
        blogger.getBlogs({}, (err, blogs) => {
            if (err)
                return next(err);
            res.locals.blogs = blogs;
            res.htmlPage.send();
        });
    })
        .catch(next);
}
exports.bloggerHome = bloggerHome;
