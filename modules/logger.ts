import {Types} from "mongoose";
import {LipthusApplication, LipthusRequest, LipthusResponse} from "../index";
import {Collection, Db, InsertOneWriteOpResult} from "mongodb";
import {LipthusError} from "../classes/lipthus-error";
import {NextFunction} from "express";

const botRe = /^\/(videos|bdf|resimg|optimg|ajax\/|c\/|cache|admin|form-log|responsive|bot)/;

export class LipthusLogger {
	
	public db: Db;
	
	constructor(public req: LipthusRequest) {
		this.db = req.db._conn;
		
		Object.defineProperty(req, 'logger', {value: this});
	}
	
	collection(type: string): Collection {
		return this.db.collection('logger.' + type);
	}
	
	log(type: string, extra?: { [s: string]: any }): Promise<InsertOneWriteOpResult> {
		const obj = this.baseObj();
		
		if (extra)
			Object.assign(obj, extra);
		
		return this.collection(type)
			.insertOne(obj)
			.then(() => obj);
	}
	
	logError(err: LipthusError): Promise<any> {
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
			});
	}
	
	logNotFound(): Promise<InsertOneWriteOpResult> {
		return this.log('notfound');
	}
	
	logUpdate(obj: string | any, id?: string, field?: string, value?: any): Promise<InsertOneWriteOpResult> {
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
		return this.collection(type).count({});
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
	
	notfoundArray(cb: any): Promise<any> {
		return this.collection('notfound').distinct('url', cb);
	}
	
	notfoundDetails(a: string, cb: any): void {
		this.collection('notfound').find({url: a}).toArray(cb);
	}
	
	notfoundRemove(a: string, cb: any): void {
		this.collection('notfound').deleteOne({url: a}, cb);
	}
	
	static init(app: LipthusApplication): void {
		app.use(LipthusLogger.middleware);
		app.use(LipthusLogger.botMiddleware);
	}
	
	static middleware(req: LipthusRequest, res: LipthusResponse, next: NextFunction): void {
		req.session.debug = parseInt(req.body.debug || req.query.debug || req.session.debug, 10) || 0;
		
		const logger = new LipthusLogger(req);
		
		req.logError = logger.logError.bind(logger);
		
		next();
	}
	
	static botMiddleware(req: LipthusRequest, res: LipthusResponse, next: NextFunction): void {
		// req.device.type = 'bot';
		// req.headers['user-agent'] = "Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)";
		if (req.device.type !== 'bot' || botRe.test(req.path))
			return next();
		
		req.db.botlog
			.log(req)
			.then(() => next())
			.catch(next);
	}


// Ajax helpers
	
	static notfoundArray(req: LipthusRequest, res: LipthusResponse, cb: Promise<any>) {
		return req.logger.notfoundArray(cb);
	}
	
	static notfoundDetails(req: LipthusRequest, res: LipthusResponse, a: any, cb: any): void {
		req.logger.notfoundDetails(a, cb);
	}
	
	static notfoundRemove(req: LipthusRequest, res: LipthusResponse, a: any, cb: any): void {
		req.logger.notfoundRemove(a, cb);
	}
}
