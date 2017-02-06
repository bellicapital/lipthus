"use strict";

const ReqModel = require('./reqmodel');

class ReqDb{
	/**
	 *
	 * @param db
	 * @param req
	 */
	constructor(db, req){
		this._db = db;
		this._req = req;
        this.models = {};

		Object.keys(db.schemas).forEach(s => {
            Object.defineProperty(this, s, {
                get: () => this.model(s)
            });
		});
	}

	get db(){
		return this._db;
	}

	get req(){
		return this._req;
	}

	get _conn() {
		return this._db._conn;
	}

	toString(){
		return this._db.name;
	}

    model(name){
        if(!this.models[name])
            this.models[name] = new ReqModel(this._db.model(name), this._req);

        return this.models[name];
    }
}

function middleware(req) {
	const dbs = {};

	Object.keys(req.site.dbs).forEach(k => dbs[k] = new ReqDb(req.site.dbs[k], req));

	Object.defineProperties(req, {
		db: {value: new ReqDb(req.site.db, req)},
		dbs: {value: dbs}
	});

	req.next();
}

middleware.ReqDB = ReqDb;

module.exports = middleware;