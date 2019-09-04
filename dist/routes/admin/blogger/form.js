"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
function bloggerForm(req, res, next) {
    const schema = req.params.schema;
    const id = req.params.id;
    res.locals.hasThumb = !!req.db.schemas[schema].paths.thumb;
    res.locals.hasSocial = !!req.db.schemas[schema].paths.socialImage;
    res.locals.schema = schema;
    res.htmlPage
        .init({
        title: 'Blogger',
        sitelogo: true,
        view: 'admin/blogger/form',
        layout: 'base',
        userLevel: 2,
        userType: 'blogger'
    })
        .then((page) => page.head
        .addJS('//cdn.tinymce.com/4/tinymce.min.js')
        .addJS('progressbar.js')
        .addJS('image.js')
        .addJS('video.js')
        .addJS('form/jquery.html5uploader.js')
        .addJS('form/filefield.js')
        .addJS('form/mobileform.js')
        .addJS('form/formfile.js')
        .addJS('admin/blogger.js')
        .addCSS('mobile-form')
        .addJS('video.js'))
        .then(() => req.ml.availableLangNames())
        .then((langNames) => res.htmlPage.addJSVars({ langNames: langNames }))
        .then(() => {
        if (id === 'new-post')
            return res.locals.post = { published: new Date() };
        const re = /\.html$/;
        let query;
        if (mongoose_1.Types.ObjectId.isValid(id))
            query = { _id: id };
        else if (id.match(re))
            query = { url: id.replace(re, '') };
        else
            return next();
        // Formulario
        return req.db[schema].findOne(query)
            .then((post) => {
            if (!post)
                throw 404;
            return post.populate('submitter modifier', 'uname').execPopulate();
        })
            .then((post) => {
            res.locals.post = post.getValues4Edit().vars;
            res.locals.post.created = post.created.toUserDateString() + " - " + post.created.toLocaleTimeString() + (post.submitter ? " - " + post.submitter.uname : "");
            res.locals.post.modified = post.modified.toUserDateString() + " - " + post.modified.toLocaleTimeString() + (post.modifier ? " - " + post.modifier.uname : "");
            res.locals.post.thumb = post.thumb ? post.thumb.formDataValue() : '';
            res.locals.post.socialImage = post.socialImage ? post.socialImage.formDataValue() : '';
            res.locals.post.image = post.image ? post.image.formDataValue() : '';
            res.locals.post.video = post.video ? post.video.formDataValue() : '';
            res.locals.post.link = post.getLink();
        });
    })
        .then(() => res.htmlPage.send())
        .catch(next);
}
exports.bloggerForm = bloggerForm;
