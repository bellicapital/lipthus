import {IpLocation} from "./geo/ip-location";

export = function () {
	return (req, res, next) => {
		Object.defineProperty(req, 'ipLocation', {
			get: () => {
				if (req.ipLocation_)
					return req.ipLocation_;

				const ipl = new IpLocation(req);

				req.ipLocation_ = ipl;

				return ipl;
			}
		});

		next();
	};
};
