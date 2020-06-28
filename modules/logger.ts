import {Types} from "mongoose";
import {LipthusApplication, LipthusRequest, LipthusResponse} from "../index";
import {Collection} from "mongodb";
import {LipthusError} from "../classes/lipthus-error";
import {NextFunction} from "express";


export class LipthusLogger {

	static init(app: LipthusApplication): void {
		app.db.collection('logger.updates')
			.createIndex({itemid: 1})
			.catch(console.warn.bind(console));

		app.use(LipthusLogger.middleware);
	}

	static middleware(req: LipthusRequest, res: LipthusResponse, next: NextFunction): void {
		const logger = new LipthusLogger(req);

		req.logError = logger.logError.bind(logger);

		next();
	}

	constructor(public req: LipthusRequest) {
		Object.defineProperty(req, 'logger', {value: this});
	}

	collection(type: string): Collection {
		return this.req.db.collection('logger.' + type);
	}

	log(collection: string | Collection, extra?: { [s: string]: any }): Promise<any> {
		const obj = this.baseObj();

		if (extra)
			Object.assign(obj, extra);

		if (typeof collection === 'string')
			collection = this.collection(collection);

		return collection
			.insertOne(obj)
			.then(() => obj);
	}

	logError(err: LipthusError): Promise<void | Error> {
		const type = err.type || 'error';
		const col = this.collection(type);
		const obj: any = {
			stack: err.stack,
			last: new Date()
		};

		return col.findOne({stack: obj.stack})
			.then(error2 => {
				if (error2) {
					return col
						.updateOne({_id: error2._id}, {$set: {last: obj.last, repeated: ++error2.repeated}})
						.then(() => {
						});
				} else {
					if (err.status)
						obj.status = err.status;

					obj.repeated = 0;

					return this.log(type, obj).then(() => {
					});
				}
			})
			.catch((err2: Error) => {
				console.error.bind(console);

				return err2;
			});
	}

	logNotFound(): Promise<any> {
		return this.log('notfound');
	}

	logUpdate(obj: LogUpdateParams | string, id?: string, field?: string, value?: any): Promise<any> {
		if (typeof obj !== 'object') {
			obj = {
				schema_: obj,
				itemid: id,
				field: field,
				value: value
			};
		}

		if (this.req.user) {
			obj.uid = this.req.user._id || Types.ObjectId('' + this.req.user);
		}

		return this.collection('updates').insertOne(obj);
	}

	count(type: string): Promise<number> {
		return this.collection(type).countDocuments({});
	}

	list(type: string, query: any, opt: any, cb: () => {}): void {
		// noinspection JSDeprecatedSymbols
		this.collection(type).find(query, opt).toArray(cb);
	}

	baseObj(): any {
		const req = this.req;
		const res = this.req.res;
		const ret: any = {
			url: req.protocol + '://' + req.get('host') + req.originalUrl,
			method: req.method,
			agent: req.get('user-agent'),
			referer: req.get('referer'),
			device: req.device ? req.device.type : 'unknown',
			ipLocation: req.ipLocation,
			created: new Date()
		};

		if (!ret.referer)
			delete ret.referer;

		if (req.method === 'POST')
			ret.postKeys = Object.keys(req.body);

		if (res.statusCode && res.statusCode !== 200)
			ret.code = res.statusCode;

		return ret;
	}
}

export interface LogUpdateParams {
	schema_: string;
	itemid: any;
	field: string;
	value: any;
	uid?: any;
}


