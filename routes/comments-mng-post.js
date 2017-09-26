"use strict";

module.exports = function (req, res, next){
	const comments = req.body.db ? req.site.dbs[req.body.db].comment : req.db.comment;

	comments.findById(req.body.id, function(err, comment){
		if(err)
			return next(err);

		if(req.body.answer){
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

			req.ml.load('ecms-comment')
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
				})
				.catch(err => {
					req.notifyError(err);
				});
		} else {
			if(req.body.active){
				comment.active = true;
				comment.refused = false;
			} else if(req.body.refuse){
				comment.active = false;
				comment.refused = true;
			} else
				return next(new Error('Parámetros no válidos en el estado del comentario'));
		}

		comment.modifier = req.user;

		comment.save(function(err){
			if(err)
				return next(err);

			res.redirect(req.originalUrl);
		});
	});
};