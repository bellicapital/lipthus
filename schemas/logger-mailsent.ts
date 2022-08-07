import * as debug0 from 'debug';
import {LipthusSchema} from "../lib";

const debug = debug0('site:mailsent');

export const name = 'mailsent';

export function getSchema() {
	const s = new LipthusSchema({
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
						message: 'No se ha enviado el email ' + this._id + ' a '	+ (this as any).email.to	+ ' por estar en modo desarrollo'
					};
				}

				return (this.db as any).lipthusDb.site.mailer.send((this as any).email);
			})
			.then((result: any) => this.set('result', result))
			.catch((err: Error) => this.set('error', err))
			.then(() => debug((this as any).result || (this as any).error))
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
