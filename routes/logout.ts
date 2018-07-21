import {LipthusRequest, LipthusResponse} from "../index";

export default (req: LipthusRequest, res: LipthusResponse) => {
	delete req.session.cart;
	req.logout();
	res.redirect('/');
};
