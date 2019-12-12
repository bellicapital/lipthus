const geo = require('../geo');
const ipLocation = geo.ipLocation;

module.exports = function () {
	return (req, res, next) => {
		Object.defineProperty(req, 'ipLocation', {
			get: () => {
				if (req.ipLocation_)
					return req.ipLocation_;

				const ipl = ipLocation(req);

				req.ipLocation_ = ipl;

				return ipl;
			}
		});

		next();
	};
};
