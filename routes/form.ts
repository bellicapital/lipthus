import {LipthusRequest, LipthusResponse} from "../index";


const EucaForm = require('../modules/form');

export default (req: LipthusRequest, res: LipthusResponse) => {
	EucaForm.processReq(req)
		.then((r: any) => res.json(r))
		.catch((err: Error) => {
			res.json({error: err.message || err});

			console.error(err);
		});
};
