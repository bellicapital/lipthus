"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// noinspection JSUnusedGlobalSymbols
/**
 *
 * @param {object} req
 * @param {object} query
 * @param {*} fields
 * @param {*} options
 */
function findAndGetValuesWithCommentCount(req, query = {}, fields, options) {
    if (!req || !req.ml)
        return Promise.reject(new Error('Invalid request'));
    return this
        .find(query, fields, options)
        .values(req);
    // esto dió problemas en el servidor 26/9/17
    // .then(r => {
    // 	if(!r)
    // 		return;
    //
    // 	const ids = [];
    //
    // 	r.forEach(item => ids.push(item._id));
    //
    // 	return this.db.models.comment.countById({'ref.$id': {$in: ids}, active: true})
    // 		.then(comments => r.forEach(item => item.comments = comments[item._id] || 0))
    // 		.then(() => r);
    // });
}
exports.findAndGetValuesWithCommentCount = findAndGetValuesWithCommentCount;
// cb retorna err, values, docs
// @deprecated. Use find().values(req)
function findAndGetValues(req, query = {}, fields, options, cb) {
    console.warn('findAndGetValues callback function is deprecated. Now uses Promise.');
    this.find(query, fields, options, (err, result) => {
        if (err || !result)
            return cb(err, result, []);
        Promise.all(result.map(item => item.getValues(req)))
            .then(values => cb(undefined, values, result)).catch(cb);
    });
}
exports.findAndGetValues = findAndGetValues;
// noinspection JSUnusedGlobalSymbols
function getByParent(parentId, fields, options, cb) {
    return this.find({ 'parents.$id': new mongoose_1.Types.ObjectId(parentId) }, fields, options, cb);
}
exports.getByParent = getByParent;
function checkAll(req, cb) {
    const ret = {};
    const dates = [];
    const exclude = ['modified', 'created'];
    this.schema.eachPath(function (name, path) {
        if (path.options.type === Date && exclude.indexOf(name) === -1)
            dates.push(name);
    });
    this.find((err, r) => {
        r.forEach(doc => {
            if (doc === null)
                return cb(undefined, { repaired: ret });
            dates.forEach(d => {
                if (!doc[d] || doc[d] instanceof Date)
                    return;
                if (!ret[d])
                    ret[d] = 1;
                else
                    ++ret[d];
                const match = doc[d].match(/^(\d+)[\/-](\d+)[\/-](\d+)/);
                if (match)
                    doc[d] = new Date(match[3], match[2], match[1]);
                else
                    doc[d] = new Date(doc[d]);
                if (doc[d].toString() === 'Invalid Date')
                    delete doc[d];
                const update = { $set: {} };
                update.$set[d] = doc[d];
                this.updateOne({ _id: doc._id }, update, () => { });
            });
        });
        cb(undefined, { repaired: ret });
    });
}
exports.checkAll = checkAll;
// noinspection JSUnusedGlobalSymbols
function translatableFieldList() {
    const fields = [];
    const st = this.schema.tree;
    Object.each(st, (i, v) => {
        if (v.translatable)
            fields.push(i);
    });
    return fields;
}
exports.translatableFieldList = translatableFieldList;
// noinspection JSUnusedGlobalSymbols
function colTitle(lang) {
    return this.schema.options.title.getLang(lang);
}
exports.colTitle = colTitle;
function getCleanVars4Edit() {
    const ret = new this().toObject();
    delete ret._id;
    delete ret.parents;
    delete ret.children;
    delete ret.rating;
    return ret;
}
exports.getCleanVars4Edit = getCleanVars4Edit;
