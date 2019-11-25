"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_1 = require("../../lib");
const Types = lib_1.LipthusSchema.Types;
// para el video, es necesario haber ejecutado antes .loadFiles()
function getThumb(width, height, crop, enlarge) {
    let src;
    ['thumb', 'image', 'video'].some((k) => !!(src = this[k]));
    return src && src.getThumb(width, height, crop, enlarge);
}
exports.getThumb = getThumb;
// para el video, es necesario haber ejecutado antes .loadFiles()
// noinspection JSUnusedGlobalSymbols
function getImage(width, height, crop, enlarge) {
    let src;
    ['image', 'video'].some((k) => !!(src = this[k]));
    return src && src.getThumb(width, height, crop, enlarge);
}
exports.getImage = getImage;
// para el video, es necesario haber ejecutado antes .loadFiles()
// noinspection JSUnusedGlobalSymbols
function getSocialImage() {
    return this.socialImage && this.socialImage.getThumb() || this.getImage();
}
exports.getSocialImage = getSocialImage;
// noinspection JSUnusedGlobalSymbols
function getSocialTitle(lang) {
    let ret = this[this.schema.get('identifier') || 'title'];
    if (!ret)
        return;
    if (ret.getLang)
        ret = ret.getLang(lang);
    if (typeof ret !== 'string') {
        if (ret.toString)
            ret = ret.toString();
        else
            return;
    }
    return ret.truncate(58);
}
exports.getSocialTitle = getSocialTitle;
// noinspection JSUnusedGlobalSymbols
function getSocialDescription(lang) {
    let ret = this[this.schema.get('descIdentifier') || 'description'];
    if (!ret)
        return;
    if (ret.getLang)
        ret = ret.getLang(lang);
    if (typeof ret !== 'string') {
        if (ret.toString)
            ret = ret.toString();
        else
            return;
    }
    return ret.truncate(158);
}
exports.getSocialDescription = getSocialDescription;
function hasChildren() {
    // TODO
    return Promise.resolve();
}
exports.hasChildren = hasChildren;
function getChildren(filters, query, fields, options, cb) {
    if (typeof filters === 'function') {
        cb = filters;
        filters = [];
        query = {};
        options = {};
    }
    else if (typeof query === 'function') {
        cb = query;
        query = {};
        options = {};
    }
    else if (typeof fields === 'function') {
        cb = fields;
        fields = null;
        options = {};
    }
    else if (typeof options === 'function') {
        cb = options;
        if (typeof fields === 'string')
            options = {};
        else
            options = fields;
    }
    else if (!options)
        options = {};
    if (typeof cb === 'function')
        console.error(new Error('@deprecated: do.getChildren() now returns Promise'));
    return new Promise((ok, ko) => {
        this._getChildren(filters, query, fields, options, (err, children) => {
            err ? ko(err) : ok(children);
        });
    });
}
exports.getChildren = getChildren;
function _getChildren(filters, query = {}, fields, options, cb) {
    const arr = {};
    const ret = {};
    if (!filters.length)
        filters = this.db.models.dynobject.schema.statics.getKeys();
    else {
        if (typeof filters === 'string')
            filters = [filters];
        filters.forEach((f, i) => filters[i] = f.replace('dynobjects.', ''));
    }
    filters.forEach((f) => arr[f] = []);
    if (this.children) {
        Object.values(this.children).forEach((v) => {
            const ns = v.namespace.replace('dynobjects.', '');
            if (filters.indexOf(ns) !== -1)
                arr[ns].push(v.oid.toString());
        });
    }
    if (!Object.keys(arr).length)
        return cb(undefined, ret);
    const db = this.db.lipthusDb;
    query['parents.$id'] = this._id;
    function cr(ns, ids, icb) {
        db.model(ns).find(query, fields, options, (err, r) => {
            if (err || !ids.length)
                return icb(err, r);
            if (arr[ns].length && !options.sort) {
                // Ordena según los children definidos
                r.sort((a, b) => {
                    return arr[ns].indexOf(a._id.toString()) - arr[ns].indexOf(b._id.toString());
                });
            }
            icb(undefined, r);
        });
    }
    Object.each(arr, (ns, ids) => {
        cr(ns, ids, (err, r) => {
            if (err)
                return cb(err);
            ret[ns] = r;
            if (Object.keys(ret).length === Object.keys(arr).length)
                cb(undefined, ret);
        });
    });
}
exports._getChildren = _getChildren;
// noinspection JSUnusedGlobalSymbols
function removeParent(colname, parentId, cb) {
    if (typeof parentId === 'string')
        parentId = new Types.ObjectId(parentId);
    const thisId = this._id + '';
    const db = this.db;
    db.collections[colname].findOne({ _id: parentId }, (err, parent) => {
        if (err)
            return cb(err);
        if (!parent)
            console.warn('Parent ' + parentId + ' not found');
        else {
            let childFound;
            const children = [];
            Object.values(parent.children).forEach((v) => {
                if (v.oid + '' !== thisId)
                    children.push(v);
                else
                    childFound = true;
            });
            if (childFound) {
                parent.children = children;
                db.collections[colname].updateOne({ id: parent._id }, { children: children }, (err2) => err2 && console.warn(err2));
            }
            else
                console.warn('Child ' + thisId + ' not found in ' + colname + '.' + parentId);
        }
        let parentFound;
        const parents = [];
        if (this.parents)
            this.parents.forEach((p) => {
                if (p.oid.equals(parentId))
                    parentFound = true;
                else
                    parents.push(p);
            });
        if (parentFound) {
            this.parents = parents;
            this.update({ parents: parents }, { w: 1 }, (r) => cb(err, r));
        }
        else
            cb(null, 0);
    });
}
exports.removeParent = removeParent;
function addParent(colname, id, cb) {
    if (typeof id === 'string')
        id = new Types.ObjectId(id);
    // Avoid posible duplicates
    const parents = [];
    Object.values(this.parents).forEach((v) => {
        if (!v.oid.equals(id))
            parents.push(v);
    });
    this.parents = parents;
    // end avoid
    this.parents.push(new lib_1.DBRef(colname, id, this.db.name));
    // No manipula el padre porque hay un post save que si no está, lo añade
    this.update({ parents: this.parents }, cb);
}
exports.addParent = addParent;
// noinspection JSUnusedGlobalSymbols
function getNodeData(req, level, filter) {
    const lang = req.ml.lang;
    const ret = {
        title: this.title && this.title[lang] || this.title,
        id: this.id,
        colname: this.schema.get('collection').replace('dynobjects.', '')
    };
    if (!level--)
        return this.hasChildren().then(() => {
            ret.hasChildren = true;
            return ret;
        });
    return this.getChildren(filter)
        .then((r) => {
        if (!Object.keys(r).length)
            return ret;
        let count = 0;
        return new Promise(ok => {
            Object.values(r).forEach((rc) => {
                let count2 = 0;
                if (!rc.length) {
                    if (++count === Object.keys(r).length)
                        ok(ret);
                }
                else {
                    if (!ret.children)
                        ret.children = [];
                    rc.forEach((obj) => {
                        obj.getNodeData(req, level, filter).then((nd) => {
                            ret.children.push(nd);
                            if (++count2 === rc.length && ++count === Object.keys(r).length)
                                ok(ret);
                        }).catch(console.error.bind(console));
                    });
                }
            });
        });
    });
}
exports.getNodeData = getNodeData;
// noinspection JSUnusedGlobalSymbols
function commentsCount(cb) {
    return this.db.models.comment.countDocuments({ 'ref.$id': this._id, active: true }, cb);
}
exports.commentsCount = commentsCount;
// noinspection JSUnusedGlobalSymbols
function rate(req, rating) {
    return req.ml.load('ecms-rating')
        .then(() => {
        if (req.session.rated && req.session.rated.some((rateObj, idx) => {
            if (this.id === rateObj.id) {
                if (new Date(rateObj.time).toDateString() === new Date().toDateString())
                    return true;
                req.session.rated.splice(idx, 1);
            }
        })) {
            return { msg: req.ml.all._ALREADY_VOTED };
        }
        rating = parseInt(rating, 10);
        if (!rating || rating > 5)
            throw new Error('Bad value');
        const rated = req.session.rated || [];
        rated.push({
            id: this._id,
            time: new Date()
        });
        req.session.rated = rated;
        if (!this.ratingCount) {
            this.rating = rating;
            this.ratingCount = 1;
        }
        else {
            let rCount = this.ratingCount++;
            // si hay mas de 10 valoraciones, estas contarán como 1/4 parte. jj - 16/07/15
            if (rCount > 10)
                rCount = 10 + Math.round(rCount / 4);
            this.rating = Math.round(((Math.min(this.rating, 5) * rCount + rating) / ++rCount) * 100) / 100;
        }
        return this.update({ rating: this.rating, ratingCount: this.ratingCount })
            .then(() => req.db.rate.createNew(req, this, rating))
            .then(() => {
            return new Promise((ok, ko) => {
                req.session.save((err) => {
                    if (err)
                        ko(err);
                    else
                        ok({ status: 'ok', msg: req.ml.all._THANKS4RATING });
                });
            });
        });
    });
}
exports.rate = rate;
function vote(req) {
    return req.ml.load('ecms-rating')
        .then(() => {
        if (req.session.voted && req.session.voted.some((rateObj, idx) => {
            if (this.id === rateObj.id) {
                if (new Date(rateObj.time).toDateString() === new Date().toDateString())
                    return true;
                req.session.voted.splice(idx, 1);
            }
        })) {
            return { msg: req.ml.all._ALREADY_VOTED };
        }
        const voted = req.session.voted || [];
        voted.push({
            id: this._id,
            time: new Date()
        });
        req.session.voted = voted;
        if (!this.ratingCount)
            this.ratingCount = 1;
        else
            this.ratingCount++;
        return this.update({ ratingCount: this.ratingCount })
            .then(() => req.db.vote.log(req, this))
            .then(() => {
            return new Promise((ok, ko) => {
                req.session.save((err) => {
                    if (err)
                        ko(err);
                    else
                        ok({ status: 'ok', msg: req.ml.all._THANKS4RATING });
                });
            });
        });
    });
}
exports.vote = vote;
function getLink(req) {
    const host = req && req.headers ? 'http://' + req.headers.host : '';
    return host + '/' + (this.schema.get('baseurl') || this.schema) + '/' + this.id;
}
exports.getLink = getLink;
// retorna el nombre de una opción (selector, checkbox...) en el idioma actual
function getName(pathname, req, cb) {
    if (typeof cb === 'function')
        console.error(new Error('schema getVar is @deprecated'));
    const schema = this.schema;
    const path = schema.tree[pathname];
    const o = path.options;
    const val = this.get(pathname);
    const lang = req.ml.lang;
    return new Promise((ok, ko) => {
        if (!path.multilang)
            return ok(val);
        if (!val || !o[val])
            return ok(val);
        if (o[val][lang])
            return ok(o[val][lang]);
        const toTranslate = o[val][req.ml.configLang];
        if (!toTranslate || !req.ml.translateAvailable())
            return ok(toTranslate);
        req.ml.translate(toTranslate, (err, result) => {
            if (err)
                return ko(err);
            if (!result)
                return ok(toTranslate);
            o[val][lang] = result;
            const query = { colname: schema.options.collection.replace('dynobjects.', '') };
            const update = {};
            update['dynvars.' + pathname + '.options.' + val + '.' + lang] = result;
            req.db.dynobject.updateOne(query, update)
                .then(() => ok(result))
                .catch(ko);
        }, 'getName • ' + this.schema + ' • ' + pathname);
    });
}
exports.getName = getName;
function changeVar(name, val) {
    if (this.schema.tree[name].multilang && typeof val === 'object' && this.get(name)) {
        const value = this.get(name);
        Object.each(val, (code, v) => {
            value[code] = v;
        });
        val = value;
        this.markModified(name);
    }
    const update = {};
    if (lib_1.LipthusSchemaTypes.BdfList === this.schema.path(name).options.type) {
        if (val.event === 'deleteFile') {
            const key = Object.keys(this.get(name))[val.val];
            update.$unset = {};
            update.$unset[name + '.' + key] = '';
        }
    }
    else {
        update.$set = {};
        update.$set[name] = val;
    }
    return this.update(update)
        .then((r) => ({ status: r.ok === 1, value: this.get(name) }));
}
exports.changeVar = changeVar;
function globalLink() {
    return "/lmns/" + this.db.name + "." + this.schema + "/" + this.id;
}
exports.globalLink = globalLink;
