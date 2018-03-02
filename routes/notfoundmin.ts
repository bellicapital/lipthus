import {LipthusRequest, LipthusResponse} from "../typings/lipthus";


export = function(req: LipthusRequest, res: LipthusResponse) {
	res.status(404).render(req.site.lipthusDir + '/views/status/404', {host: req.headers.host});
};
