import {LipthusRequest, LipthusResponse} from "../index";

export default (req: LipthusRequest, res: LipthusResponse) => {
	delete req.session.cart;

	req.logout();

	Object.keys(req.cookies).forEach((k => res.clearCookie(k)));

	res.redirect('/');
};
