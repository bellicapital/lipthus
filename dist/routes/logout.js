"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (req, res) => {
    delete req.session.cart;
    req.logout();
    Object.keys(req.cookies).forEach((k => res.clearCookie(k)));
    res.redirect('back');
};
