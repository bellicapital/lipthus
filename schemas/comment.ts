import {DBRef, LipthusSchema} from "../lib";
import {LipthusRequest} from "../index";
import {KeyString} from "../interfaces/global.interface";
import {Document, Model, Types} from "mongoose";

const md5 = require('md5');

export const name = "comment";

const Answer = new LipthusSchema({
	active: Boolean,
	name: String,
	created: {type: Date, default: Date.now},
	submitter: {type: LipthusSchema.Types.ObjectId, ref: 'user'},
	text: String,
	iplocation: {}
});

export interface Answer {
	active: boolean;
	name: string;
	created: Date;
	submitter?: Types.ObjectId;
	text: string;
	iplocation?: any;
}

export interface IpLocation {
	ip: string;
	area_code?: string;
	dma_code?: string;
	longitude?: number;
	latitude?: number;
	postal_code?: string;
	city?: string;
	region?: string;
	country_name?: string;
	country_code3?: string;
	country_code?: string;
	continent_code?: string;
}

const schema = new LipthusSchema({
	active: {type: Boolean, index: true},
	refused: {type: Boolean, index: true},
	ref: {type: DBRef.schema},
	name: String,
	email: String, // {type: String, validate: /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/},
	text: String,
	rating: Number,
	iplocation: {
		// ip: String,
		// area_code: String,
		// dma_code: String,
		// longitude: Number,
		// latitude: Number,
		// postal_code: String,
		// city: String,
		// region: String,
		// country_name: String,
		// country_code3: String,
		// country_code: String,
		// continent_code: String
	},
	url: String,
	lang: String,
	userLocation: String,
	itemTitle: String,
	answers: [Answer],
	modifier: {type: LipthusSchema.Types.ObjectId, ref: 'user'},
	submitter: {type: LipthusSchema.Types.ObjectId, ref: 'user'},
	extra: LipthusSchema.Types.Mixed
}, {
	collection: 'comments',
	lastMod: true,
	created: true
});

// noinspection JSUnusedGlobalSymbols
export function getSchema() {

	return schema.loadClass(Comment);

}

export class Comment {

	public _id: any;
	public active?: boolean;
	public refused?: boolean;
	public email!: string;
	public name!: string;
	public text!: string;
	public lang!: string;
	public iplocation?: IpLocation;
	public answers?: Array<Answer>;
	public ref?: any;
	public url?: string;
	public rating?: number;
	public created?: Date;
	public lastMod?: Date;
	public userLocation?: string;

	static find4show(this: LipthusCommentModel, query: any, limit?: number) {
		if (typeof query === 'string')
			query = Types.ObjectId(query);

		if (query instanceof Types.ObjectId)
			query = {active: true, 'ref.$id': query};

		const q = this
			.find(query)
			.sort({created: -1});

		if (limit)
			q.limit(limit);

		return q.then((comments: Array<any>) => {
			comments.forEach((c, i) => comments[i] = c.values4show());

			return comments;
		});
	}

	static async submit(this: LipthusCommentModel, req: LipthusRequest, dbName: string, colname: string, itemid: any, uname: string, email: string, text: string) {
		const config = req.site.config;

		if (!config.com_rule || (!config.com_anonpost && !req.user)) {
			const LC: KeyString = await req.ml.load('ecms-comment');

			return {error: LC._CM_APPROVE_ERROR};
		}

		const active = config.com_rule === 1 || (req.user && (req.user.isAdmin() || config.com_rule < 3));

		const db = dbName ? req.site.dbs[dbName] : req.db;

		const comment = await db.comment
			.create({
				ref: new DBRef(colname, itemid, db.name).toObject(),
				name: uname ? uname : (req.user ? req.user.getName(true) : ""),
				email: email,
				text: text,
				iplocation: req.ipLocation,
				active: active,
				url: req.get('Referer'),
				lang: req.ml.lang,
				submitter: req.user && req.user._id
			});

		if (req.user)
			await req.user.subscribe2Item(comment.get('ref'));

		db.comment.emit('submit', comment, req);

		return comment.values4show();
	}

	static countById(this: LipthusCommentModel, query: any) {
		// no usar ES6 en mongo.mapReduce hasta mongo 3.2
		// comprobar javascriptEngine field in the output of db.serverBuildInfo() que sea SpiderMonkey y no V8.
		// de momento no usamos ES6. jj - 21/6/16
		const o = {
			map: 'function () { emit(this.ref.$id, 1) }',
			reduce: 'function (k, v) { let sum = 0;' +
				'Object.keys(v).forEach(function (key) { sum += v[key] });' +
				'return sum; }',
			query: query
		};

		return this.mapReduce(o as any)
			.then((c: any) => {
				const counts: any = {};

				Object.values(c).forEach((cc: any) => counts[cc._id] = cc.value);

				return counts;
			});

	}

	static colcount(this: LipthusCommentModel, cb: any) {
		this.distinct('ref.$ref', (err: Error, d: Array<any>) => {
			if (err)
				return cb(err);

			let count = 0;

			/*global ret*/
			const ret: any = {};

			d.forEach(r => {
				this.countDocuments({'ref.$ref': r}, (err2: Error, c: number) => {
					if (c)
						ret[r.replace('dynobjects.', '')] = c;

					if (++count === d.length) {
						this.countDocuments({'ref.$ref': {$exists: false}}, (err3: Error, c2: number) => {
							if (c2)
								ret._ = c2;

							cb(err3, ret);
						});
					}
				});
			});
		});
	}

	static async colCountIncPending(this: LipthusCommentModel) {
		const ret: any = {};
		const d: Array<string> = await this.distinct('ref.$ref');

		for (const r of d) {
			const itemSchema = r ? r.replace('dynobjects.', '') : '_';
			const ref = r || null; // null hace que también se muestren los vacios. jj 7/7/15

			ret[itemSchema] = {
				total: await this.countDocuments({'ref.$ref': ref}),
				pending: await this.countDocuments({
					'ref.$ref': ref,
					active: {$ne: true},
					refused: {$ne: true}
				})
			};
		}

		return ret;
	}

	static byColname(this: LipthusCommentModel, colname: string, query: any, options?: any) {
		const ret: any = {
			comments: [],
			total: 0
		};

		query['ref.$ref'] = colname ? 'dynobjects.' + colname : null;

		return this.countDocuments(query)
			.then(count => {
				if (!count)
					return;

				ret.total = count;

				const q: any = this.find(query);

				if (options)
					Object.each(options, (o, v) => q[o](v));

				return q.populate('modifier', 'uname')
					.then((comments: Array<any>) => ret.comments = comments);
			})
			.then(() => ret);
	}

	values4show() {
		const d = this.created || this._id.getTimestamp();

		return {
			id: this._id,
			created: d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear(),
			name: this.name,
			text: this.text,
			rating: this.rating,
			city: this.iplocation && this.iplocation.city,
			answers: this.answers
		};
	}

	getHash() {
		return md5(this.ref.oid.toString() + this.ref.namespace + this.text);
	}

	getItem(fields?: any) {
		if (!this.ref || !this.ref.namespace)
			return Promise.resolve();

		const dbs = (this as any).db.lipthusDb.site.dbs;
		const ref = this.ref.toObject();

		if (!ref.db)
			ref.db = (this as any).db.lipthusDb.site.db.name;

		if (!dbs[ref.db])
			return Promise.reject(new Error('db ' + ref.db + ' not found'));

		return dbs[ref.db].deReference(ref.toObject ? ref.toObject() : ref, fields);
	}

	approve(req: LipthusRequest, val: boolean) {
		if (!req.user)
			return Promise.reject(new Error('no user'));
		if (!req.user.isAdmin())
			return Promise.reject(new Error('you are nat an admin user'));

		return (this as any).set({active: val, modifier: req.user._id}).save();
	}

}

// @ts-ignore
export interface LipthusComment extends Comment, Document {

}

export interface LipthusCommentModel extends Model<LipthusComment> {

}
