"use strict";

module.exports = function (req, res, next){
	if(req.query.id){
		return req.db.emaillog
			.findById(req.query.id)
			.then(email => res.send(email.email.html))
			.catch(next);
	}
	
	res.htmlPage
		.init('admin/email-log')
		.then(() => req.db.emaillog.find().sort({$natural: -1}))
		.then(r => {
			res.locals.emails = r;

			r.forEach((rr, i) => r[i] = rr.toObject());

			return res.htmlPage.send();
		})
		.catch(next);
};