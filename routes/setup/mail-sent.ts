import {LipthusRequest, LipthusResponse} from "../../index";

const pendingQuery = {
	result: {$exists: false},
	error: {$exists: false}
};

export function mailSentList(req: LipthusRequest, res: LipthusResponse) {
	const query: any = req.body.pending ? pendingQuery : {};
	
	return req.db.mailsent.find(query)
		.then((r: Array<any>) => {
			const arr = r.map((m: any) => ({
				_id: m.id,
				to: m.email.to,
				subject: m.email.subject,
				created: m.created
			}));
			
			res.json(arr);
		});
}

export function sendMail(req: LipthusRequest, res: LipthusResponse) {
	
	return req.db.mailsent.findById(req.body.id)
		.then((email: any) => email.send())
		.then((r: any) => {
			const ret: any = {};

			if (r.result)
				Object.assign(ret, r.result);

			if (r.error)
				ret.error = r.error;

			res.json(ret);
		});
}

export function sendPendingMails(req: LipthusRequest, res: LipthusResponse) {
	
	return req.db.mailsent.find(pendingQuery)
		.then((r: Array<any>) => {
			r.reduce((a, b) => a.then(() => b.send()), Promise.resolve());
			
			res.json({status: 'Sending ' + r.length + ' emails in background'});
		});
}
