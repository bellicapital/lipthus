import {LipthusRequest, LipthusResponse} from "../index";

const methods: any = {
	langnames: (req: LipthusRequest) => req.ml.availableLangNames()
};

export default function(req: LipthusRequest, res: LipthusResponse) {
	const method = methods[req.params.method];

	if (!method)
		return res.send({error: 'Method not found'});

	method(req).then((r: any) => res.send(r));
};
