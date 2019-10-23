"use strict";
module.exports = (req, res, next) => {
    req.app.subscriptor
        .unsubscribe(req.query.email)
        //.then(found => {// se comunica el mismo mensaje de que ya no está suscrito})
        .then(req.ml.load.bind(req.ml, 'ecms-subscription'))
        .then(() => res.htmlPage.msg(req.ml.all._SUBS_bye))
        .catch(next);
};
