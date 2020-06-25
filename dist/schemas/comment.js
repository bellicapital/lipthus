"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Comment = exports.getSchema = exports.name = void 0;
const lib_1 = require("../lib");
const mongoose_1 = require("mongoose");
const md5 = require('md5');
exports.name = "comment";
const Answer = new lib_1.LipthusSchema({
    active: Boolean,
    name: String,
    created: { type: Date, default: Date.now },
    submitter: { type: lib_1.LipthusSchema.Types.ObjectId, ref: 'user' },
    text: String,
    iplocation: {}
});
const schema = new lib_1.LipthusSchema({
    active: { type: Boolean, index: true },
    refused: { type: Boolean, index: true },
    ref: { type: lib_1.DBRef.schema },
    name: String,
    email: String,
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
    modifier: { type: lib_1.LipthusSchema.Types.ObjectId, ref: 'user' },
    submitter: { type: lib_1.LipthusSchema.Types.ObjectId, ref: 'user' },
    extra: lib_1.LipthusSchema.Types.Mixed
}, {
    collection: 'comments',
    lastMod: true,
    created: true
});
// noinspection JSUnusedGlobalSymbols
function getSchema() {
    return schema.loadClass(Comment);
}
exports.getSchema = getSchema;
class Comment {
    static find4show(query, limit) {
        if (typeof query === 'string')
            query = mongoose_1.Types.ObjectId(query);
        if (query instanceof mongoose_1.Types.ObjectId)
            query = { active: true, 'ref.$id': query };
        const q = this
            .find(query)
            .sort({ created: -1 });
        if (limit)
            q.limit(limit);
        return q.then((comments) => {
            comments.forEach((c, i) => comments[i] = c.values4show());
            return comments;
        });
    }
    static async submit(req, dbName, colname, itemid, uname, email, text) {
        const config = req.site.config;
        if (!config.com_rule || (!config.com_anonpost && !req.user)) {
            const LC = await req.ml.load('ecms-comment');
            return { error: LC._CM_APPROVE_ERROR };
        }
        const active = config.com_rule === 1 || (req.user && (req.user.isAdmin() || config.com_rule < 3));
        const db = dbName ? req.site.dbs[dbName] : req.db;
        const comment = await db.comment
            .create({
            ref: new lib_1.DBRef(colname, itemid, db.name).toObject(),
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
    static countById(query) {
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
        return this.mapReduce(o)
            .then((c) => {
            const counts = {};
            Object.values(c).forEach((cc) => counts[cc._id] = cc.value);
            return counts;
        });
    }
    static colcount(cb) {
        this.distinct('ref.$ref', (err, d) => {
            if (err)
                return cb(err);
            let count = 0;
            /*global ret*/
            const ret = {};
            d.forEach(r => {
                this.countDocuments({ 'ref.$ref': r }, (err2, c) => {
                    if (c)
                        ret[r.replace('dynobjects.', '')] = c;
                    if (++count === d.length) {
                        this.countDocuments({ 'ref.$ref': { $exists: false } }, (err3, c2) => {
                            if (c2)
                                ret._ = c2;
                            cb(err3, ret);
                        });
                    }
                });
            });
        });
    }
    static async colCountIncPending() {
        const ret = {};
        const d = await this.distinct('ref.$ref');
        for (const r of d) {
            const itemSchema = r ? r.replace('dynobjects.', '') : '_';
            const ref = r || null; // null hace que también se muestren los vacios. jj 7/7/15
            ret[itemSchema] = {
                total: await this.countDocuments({ 'ref.$ref': ref }),
                pending: await this.countDocuments({
                    'ref.$ref': ref,
                    active: { $ne: true },
                    refused: { $ne: true }
                })
            };
        }
        return ret;
    }
    static byColname(colname, query, options) {
        const ret = {
            comments: [],
            total: 0
        };
        query['ref.$ref'] = colname ? 'dynobjects.' + colname : null;
        return this.countDocuments(query)
            .then(count => {
            if (!count)
                return;
            ret.total = count;
            const q = this.find(query);
            if (options)
                Object.each(options, (o, v) => q[o](v));
            return q.populate('modifier', 'uname')
                .then((comments) => ret.comments = comments);
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
    getItem(fields) {
        if (!this.ref || !this.ref.namespace)
            return Promise.resolve();
        const dbs = this.db.lipthusDb.site.dbs;
        const ref = this.ref.toObject();
        if (!ref.db)
            ref.db = this.db.lipthusDb.site.db.name;
        if (!dbs[ref.db])
            return Promise.reject(new Error('db ' + ref.db + ' not found'));
        return dbs[ref.db].deReference(ref.toObject ? ref.toObject() : ref, fields);
    }
    approve(req, val) {
        if (!req.user)
            return Promise.reject(new Error('no user'));
        if (!req.user.isAdmin())
            return Promise.reject(new Error('you are nat an admin user'));
        return this.set({ active: val, modifier: req.user._id }).save();
    }
}
exports.Comment = Comment;
