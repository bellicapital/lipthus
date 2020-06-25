"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPendingMails = exports.sendMail = exports.mailSentList = void 0;
const pendingQuery = {
    result: { $exists: false },
    error: { $exists: false }
};
function mailSentList(req, res) {
    const query = req.body.pending ? pendingQuery : {};
    return req.db.mailsent.find(query)
        .then((r) => {
        const arr = r.map((m) => ({
            _id: m.id,
            to: m.email.to,
            subject: m.email.subject,
            created: m.created
        }));
        res.json(arr);
    });
}
exports.mailSentList = mailSentList;
function sendMail(req, res) {
    return req.db.mailsent.findById(req.body.id)
        .then((email) => email.send())
        .then((r) => {
        const ret = {};
        if (r.result)
            Object.assign(ret, r.result);
        if (r.error)
            ret.error = r.error;
        res.json(ret);
    });
}
exports.sendMail = sendMail;
function sendPendingMails(req, res) {
    return req.db.mailsent.find(pendingQuery)
        .then((r) => {
        r.reduce((a, b) => a.then(() => b.send()), Promise.resolve());
        res.json({ status: 'Sending ' + r.length + ' emails in background' });
    });
}
exports.sendPendingMails = sendPendingMails;
