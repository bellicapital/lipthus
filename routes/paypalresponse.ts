import {writeFile} from "fs";

export default function PaypalResponse(req) {
	const post = req.body;

	if (!post.test) {
		const log = JSON.stringify({
			date: new Date(),
			post: post,
			ip: req.ip
		}, null, '\t');

		writeFile(req.site.dir + '/paypalresponse_log.json', log, err => err && console.error(err));
	}
}
