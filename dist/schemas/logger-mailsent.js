"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debug0 = require("debug");
const lib_1 = require("../lib");
const debug = debug0('site:mailsent');
exports.name = 'mailsent';
function getSchema() {
    const s = new lib_1.LipthusSchema({
        email: {},
        result: {},
        error: {}
    }, {
        collection: 'logger.mailsent',
        identifier: 'to',
        created: true
    });
    s.methods.send = function () {
        return Promise.resolve()
            .then(() => {
            if (process.env.NODE_ENV !== 'production') {
                return {
                    message: 'No se ha enviado el email ' + this.id + ' a ' + this.email.to + ' por estar en modo desarrollo'
                };
            }
            return this.db.eucaDb.site.mailer.send(this.email);
        })
            .then((result) => this.set('result', result))
            .catch((err) => this.set('error', err))
            .then(() => debug(this.result || this.error))
            .then(() => this.save());
    };
    // s.statics.pendingList = function() {
    // 	return this.find({
    // 		result: {$exists: false},
    // 		error: {$exists: false}
    // 	});
    // };
    return s;
}
exports.getSchema = getSchema;
