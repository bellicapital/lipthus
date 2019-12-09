import * as os from "os";

const multipart = require('multer')({dest: os.tmpdir()}).any();

export default (req: any, res: any, next: any) => {
	req.multipart = () => new Promise((ok, ko) => multipart(req, res, (err: any, r: any) => {
		if (err)
			ko(err);
		else
			ok(r);
	}));

	next();
};
