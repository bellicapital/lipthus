import {LipthusRequest, LipthusResponse} from "../index";

export default function(req: LipthusRequest, res: LipthusResponse) {
	res.render(req.site.lipthusDir + '/views/log-req', {
		cssHead: [{src: '/cms/css/log-req.css'}]
	});
}
