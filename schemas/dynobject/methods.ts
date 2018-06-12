import {DBRef, LipthusSchema, LipthusSchemaTypes} from "../../lib";
import {LipthusRequest} from "../../index";
import {KeyAny} from "../../interfaces/global.interface";

const Types = LipthusSchema.Types;

// para el video, es necesario haber ejecutado antes .loadFiles()
export function getThumb(this: any, width: number, height: number, crop: boolean, enlarge: boolean) {
	let src: any;
	
	['thumb', 'image', 'video'].some((k: string) => !!(src = this[k]));
	
	return src && src.getThumb(width, height, crop, enlarge);
}

// para el video, es necesario haber ejecutado antes .loadFiles()
// noinspection JSUnusedGlobalSymbols
export function getImage(this: any, width: number, height: number, crop: boolean, enlarge: boolean) {
	let src: any;
	
	['image', 'video'].some((k: string) => !!(src = this[k]));
	
	return src && src.getThumb(width, height, crop, enlarge);
}

// para el video, es necesario haber ejecutado antes .loadFiles()
// noinspection JSUnusedGlobalSymbols
export function getSocialImage(this: any) {
	return this.socialImage && this.socialImage.getThumb() || this.getImage();
}

// noinspection JSUnusedGlobalSymbols
export function getSocialTitle(this: any, lang: string) {
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

// noinspection JSUnusedGlobalSymbols
export function getSocialDescription(this: any, lang: string) {
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

export function hasChildren() {
	
	// TODO
	return Promise.resolve();
}

export function getChildren(this: any, filters: any, query: any, fields: any, options: any, cb: any) {
	if (typeof filters === 'function') {
		cb = filters;
		filters = [];
		query = {};
		options = {};
	} else if (typeof query === 'function') {
		cb = query;
		query = {};
		options = {};
	} else if (typeof fields === 'function') {
		cb = fields;
		fields = null;
		options = {};
	} else if (typeof options === 'function') {
		cb = options;
		if (typeof fields === 'string')
			options = {};
		else
			options = fields;
	} else if (!options)
		options = {};
	
	if (typeof cb === 'function')
		console.error(new Error('@deprecated: do.getChildren() now returns Promise'));
	
	return new Promise((ok, ko) => {
		this._getChildren(filters, query, fields, options, (err: Error, children: Array<any>) => {
			err ? ko(err) : ok(children);
		});
	});
}

export function _getChildren(this: any, filters: any, query: KeyAny = {}, fields: any, options: any, cb: (err?: Error, r?: any) => {}) {
	const arr: {[s: string]: Array<string>} = {};
	const ret: KeyAny = {};
	
	if (!filters.length)
		filters = this.db.models.dynobject.schema.statics.getKeys();
	else {
		if (typeof filters === 'string')
			filters = [filters];
		
		filters.forEach((f: any, i: number) => filters[i] = f.replace('dynobjects.', ''));
	}
	
	filters.forEach((f: string) => arr[f] = []);
	
	if (this.children) {
		Object.values(this.children).forEach((v: any) => {
			const ns = v.namespace.replace('dynobjects.', '');
			
			if (filters.indexOf(ns) !== -1)
				arr[ns].push(v.oid.toString());
		});
	}
	
	if (!Object.keys(arr).length)
		return cb(undefined, ret);
	
	const db = this.db.eucaDb;
	
	query['parents.$id'] = this._id;
	
	function cr(ns: string, ids: Array<any>, icb: any) {
		db.model(ns).find(query, fields, options, (err?: Error, r?: any) => {
			if (err || !ids.length)
				return icb(err, r);
			
			if (arr[ns].length && !options.sort) {
				// Ordena según los children definidos
				r.sort((a: any, b: any) => {
					return arr[ns].indexOf(a._id.toString()) - arr[ns].indexOf(b._id.toString());
				});
			}
			
			icb(undefined, r);
		});
	}
	
	Object.each(arr, (ns, ids) => {
		cr(ns, ids, (err?: Error, r?: any) => {
			if (err)
				return cb(err);
			
			ret[ns] = r;
			
			if (Object.keys(ret).length === Object.keys(arr).length)
				cb(undefined, ret);
		});
	});
}

// noinspection JSUnusedGlobalSymbols
export function removeParent(this: any, colname: string, parentId: any, cb: any) {
	if (typeof parentId === 'string')
		parentId = new Types.ObjectId(parentId);
	
	const thisId = this._id + '';
	const db = this.db;
	
	db.collections[colname].findOne({_id: parentId}, (err: Error, parent: any) => {
		if (err)
			return cb(err);
		
		if (!parent)
			console.warn('Parent ' + parentId + ' not found');
		else {
			let childFound;
			const children: Array<any> = [];
			
			Object.values(parent.children).forEach((v: any) => {
				if (v.oid + '' !== thisId)
					children.push(v);
				else
					childFound = true;
			});
			
			if (childFound) {
				parent.children = children;
				
				db.collections[colname].update({id: parent._id}, {children: children}, (err2?: Error) => err2 && console.warn(err2));
			} else
				console.warn('Child ' + thisId + ' not found in ' + colname + '.' + parentId);
		}
		
		let parentFound;
		const parents: Array<any> = [];
		
		if (this.parents)
			this.parents.forEach((p: any) => {
				if (p.oid.equals(parentId))
					parentFound = true;
				else
					parents.push(p);
			});
		
		if (parentFound) {
			this.parents = parents;
			
			this.update({parents: parents}, {w: 1}, (r: any) => cb(err, r));
		} else
			cb(null, 0);
	});
}

export function addParent(this: any, colname: string, id: any | string, cb: any) {
	if (typeof id === 'string')
		id = new Types.ObjectId(id);
	
	// Avoid posible duplicates
	const parents: Array<any> = [];
	
	Object.values(this.parents).forEach((v: any) => {
		if (!v.oid.equals(id))
			parents.push(v);
	});
	
	this.parents = parents;
	// end avoid
	
	this.parents.push(new DBRef(
		colname,
		id,
		this.db.name
	));
	
	// No manipula el padre porque hay un post save que si no está, lo añade
	this.update({parents: this.parents}, cb);
}

// noinspection JSUnusedGlobalSymbols
export function getNodeData(this: any, req: LipthusRequest, level: number, filter: string) {
	const lang = req.ml.lang;
	
	const ret: any = {
		title: this.title && this.title[lang] || this.title,
		id: this.id,
		colname: this.schema.get('collection').replace('dynobjects.', '')
	};
	
	if (!level--)
		return this.hasChildren().then(() => { // temp dummy
			ret.hasChildren = true;
			return ret;
		});
	
	return this.getChildren(filter)
		.then((r: any) => {
			if (!Object.keys(r).length)
				return ret;
			
			let count = 0;
			
			return new Promise(ok => {
				Object.values(r).forEach((rc: any) => {
					let count2 = 0;
					
					if (!rc.length) {
						if (++count === Object.keys(r).length)
							ok(ret);
					} else {
						if (!ret.children)
							ret.children = [];
						
						rc.forEach((obj: any) => {
							obj.getNodeData(req, level, filter).then((nd: any) => {
								ret.children.push(nd);
								
								if (++count2 === rc.length && ++count === Object.keys(r).length)
									ok(ret);
							}).catch(console.trace.bind(console));
						});
					}
				});
			});
		});
}

// noinspection JSUnusedGlobalSymbols
export function commentsCount(this: any, cb: any) {
	return this.db.models.comment.count({'ref.$id': this._id, active: true}, cb);
}


// noinspection JSUnusedGlobalSymbols
export function rate(this: any, req: any, rating: any | number) {
	return req.ml.load('ecms-rating')
		.then(() => {
			if (req.session.rated && req.session.rated.some((rateObj: any, idx: number) => {
					if (this.id === rateObj.id) {
						if (new Date(rateObj.time).toDateString() === new Date().toDateString())
							return true;
						
						req.session.rated.splice(idx, 1);
					}
				})) {
				return {msg: req.ml.all._ALREADY_VOTED};
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
			} else {
				let rCount = this.ratingCount++;
				// si hay mas de 10 valoraciones, estas contarán como 1/4 parte. jj - 16/07/15
				if (rCount > 10)
					rCount = 10 + Math.round(rCount / 4);
				
				this.rating = Math.round(((Math.min(this.rating, 5) * rCount + rating) / ++rCount) * 100) / 100;
			}
			
			return this.update({rating: this.rating, ratingCount: this.ratingCount})
				.then(() => req.db.rate.createNew(req, this, rating))
				.then(() => {
					return new Promise((ok, ko) => {
						req.session.save((err: Error) => {
							if (err)
								ko(err);
							else
								ok({status: 'ok', msg: req.ml.all._THANKS4RATING});
						});
					});
				});
		});
}

export function vote(this: any, req: any) {
	return req.ml.load('ecms-rating')
		.then(() => {
			if (req.session.voted && req.session.voted.some((rateObj: any, idx: number) => {
					if (this.id === rateObj.id) {
						if (new Date(rateObj.time).toDateString() === new Date().toDateString())
							return true;
						
						req.session.voted.splice(idx, 1);
					}
				})) {
				return {msg: req.ml.all._ALREADY_VOTED};
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
			
			return this.update({ratingCount: this.ratingCount})
				.then(() => req.db.vote.log(req, this))
				.then(() => {
					return new Promise((ok, ko) => {
						req.session.save((err: Error) => {
							if (err)
								ko(err);
							else
								ok({status: 'ok', msg: req.ml.all._THANKS4RATING});
						});
					});
				});
		});
}

export function getLink(this: any, req: LipthusRequest) {
	const host = req && req.headers ? 'http://' + req.headers.host : '';
	
	return host + '/' + (this.schema.get('baseurl') || this.schema) + '/' + this.id;
}

// retorna el nombre de una opción (selector, checkbox...) en el idioma actual
export function getName(this: any, pathname: string, req: LipthusRequest, cb: any) {
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
		
		req.ml.translate(toTranslate, (err: Error, result: any) => {
			if (err)
				return ko(err);
			
			if (!result)
				return ok(toTranslate);
			
			o[val][lang] = result;
			
			const query = {colname: schema.options.collection.replace('dynobjects.', '')};
			const update: KeyAny = {};
			
			update['dynvars.' + pathname + '.options.' + val + '.' + lang] = result;
			
			req.db.dynobject.update(query, update)
				.then(() => ok(result))
				.catch(ko);
		}, 'getName • ' + this.schema + ' • ' + pathname);
	});
}

export function changeVar(this: any, name: string, val: any) {
	if (this.schema.tree[name].multilang && typeof val === 'object' && this.get(name)) {
		const value = this.get(name);
		
		Object.each(val, (code, v) => {
			value[code] = v;
		});
		
		val = value;
		this.markModified(name);
	}
	
	const update: any = {};
	
	if (LipthusSchemaTypes.BdfList === this.schema.path(name).options.type) {
		if (val.event === 'deleteFile') {
			const key = Object.keys(this.get(name))[val.val];
			
			update.$unset = {};
			update.$unset[name + '.' + key] = '';
		}
	} else {
		update.$set = {};
		update.$set[name] = val;
	}
	
	return this.update(update)
		.then((r: any) => ({status: r.ok === 1, value: this.get(name)}));
}

export function globalLink(this: any) {
	return "/lmns/" + this.db.name + "." + this.schema + "/" + this.id;
}
