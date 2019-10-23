"use strict";
module.exports = (req, res, next) => {
    let comment;
    return req.getUser()
        .then(() => {
        if (!req.user)
            throw 403;
        const comments = req.body.db ? req.site.dbs[req.body.db].comment : req.db.comment;
        return comments.findById(req.body.id);
    })
        .then(c => {
        comment = c;
        comment.modifier = req.user;
        if (req.body.answer) {
            comment.active = true;
            comment.refused = false;
            comment.answers.push({
                active: true,
                name: req.user ? req.user.getName() : null,
                created: new Date(),
                submitter: req.user,
                text: req.body.answer,
                iplocation: req.ipLocation
            });
            return req.ml.load('ecms-comment')
                .then(() => {
                req.site.notifier.toEmail({
                    to: comment.email,
                    subject: req.ml.all._CM_ANSWER,
                    tpl: 'notify-answer',
                    lang: comment.lang,
                    body: {
                        X_SUBJECT: req.ml.all._CM_ANSWER,
                        X_PAGE_LINK: comment.url,
                        X_COMMENT_LINK: comment.url + '#' + comment._id,
                        X_ANSWER: req.body.answer
                    }
                });
            });
        }
        else {
            if (req.body.active) {
                comment.active = true;
                comment.refused = false;
            }
            else if (req.body.refuse) {
                comment.active = false;
                comment.refused = true;
            }
            else
                throw new Error('Parámetros no válidos en el estado del comentario');
        }
    })
        .then(() => comment.save())
        .then(() => res.redirect(req.originalUrl))
        .catch(next);
};
