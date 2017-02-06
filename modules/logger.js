"use strict";

const botRe = /^\/(videos|bdf|resimg|optimg|ajax\/|c\/|cache|admin|form-log|responsive|bot)/;

class Logger {
	constructor(req) {
		Object.defineProperties(this, {
			req: {value: req},
			db: {value: req.db._conn}
		});

		Object.defineProperty(req, 'logger', {value: this});
	}

	collection(type) {
		return this.db.collection('logger.' + type);
	}

	log(type, extra) {
		const obj = this.baseObj();

		extra && Object.keys(extra).forEach(function (k) {
			obj[k] = extra[k];
		});

		return this.collection(type)
			.insertOne(obj, console.bin)
			.then(() => obj);
	}

	logError(err) {
		const type = err.type || 'error';
		const col = this.collection(type);
		const obj = {
			stack: err.stack,
			last: new Date()
		};

		return col.findOne({stack: obj.stack})
			.then(error => {
				if (error) {
					return col.update({_id: error._id}, {$set: {last: obj.last, repeated: ++error.repeated}});
				} else {
					if (err.status)
						obj.status = err.status;

					obj.repeated = 0;

					return this.log(type, obj);
				}
			});
	}

	logNotFound(cb) {
		return this.log('notfound');
	}

	logUpdate(schema, id, field, value, cb) {
		cb && console.trace('logger.logUpdate callback is deprecated. Use Promise');

		const obj = {
			schema_: schema,
			itemid: id,
			field: field,
			value: value
		};

		if (this.req.User)
			obj.uid = this.req.User._id;

		return new Promise((ok, ko) => this.collection('updates').insertOne(obj, (err, r) => {
			if(err){
				ko(err);
				cb && cb(err);
			} else {
				ok(r);
				cb && cb(null, r);
			}
		}));
	}

	count(type, cb) {
		cb && console.trace('logger.count callback is deprecated. Use Promise');

		return this.collection(type).count(cb);
	}

	list(type, query, opt, cb) {
		this.collection(type).find(query, opt).toArray(cb);
	}

	baseObj() {
		const req = this.req;
		const res = this.req.res;
		const ret = {
			url: req.protocol + '://' + req.get('host') + req.originalUrl,
			method: req.method,
			agent: req.get('user-agent'),
			referer: req.get('referer'),
			device: req.device.type,
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

	notfoundArray(cb) {
		this.collection('notfound').distinct('url', cb);
	}

	notfoundDetails(a, cb) {
		this.collection('notfound').find({url: a}).toArray(cb);
	}

	notfoundRemove(a, cb) {
		this.collection('notfound').remove({url: a}, cb);
	}

	static init(app) {
		app.use(Logger.middleware);
		app.use(Logger.botMiddleware);
	}

	static middleware(req, res, next) {
		req.session.debug = parseInt(req.body.debug || req.query.debug || req.session.debug) || 0;

		const logger = new Logger(req);

		req.logError = logger.logError.bind(logger);

		next();
	}

	static botMiddleware(req, res, next) {
		// req.device.type = 'bot';
		// req.headers['user-agent'] = "Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)";
		if(req.device.type !== 'bot' || botRe.test(req.path))
			return next();

		req.db.botlog
			.log(req)
			.then(() => next())
			.catch(next);
	}


//Ajax helpers

	static notfoundArray(req, res, cb) {
		req.logger.notfoundArray(cb);
	}

	static notfoundDetails(req, res, a, cb) {
		req.logger.notfoundDetails(a, cb);
	}

	static notfoundRemove(req, res, a, cb) {
		req.logger.notfoundRemove(a, cb);
	}
}

module.exports = Logger;