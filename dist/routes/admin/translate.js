"use strict";

const wordCount = require('html-word-count');

class TransPage {
	constructor(req, res, next) {
		Object.defineProperties(this, {
			req: {value: req},
			page: {value: res.htmlPage}
		});

		this.conf = req.site.conf.translator || {};
		this.dbs = this.conf.dbs || [req.db.name];
		this.locals = res.locals;
		this.locals.activeAll = req.cookies.translateAll === 'true';
		this.locals.path = req.path;
		this.locals.ttlangs = {};
		this.locals.path = req.path;
		this.locals.toLang = req.params.lang;

		req.ml.langUserNames()
			.then(names => {
				// quitamos el idioma fuente o principal del sitio
				delete names[req.ml.configLang];

				res.locals.ttlangs = names;

				if (req.params.lang === 'stats')
					return this.stats(next);

				if (!req.params.lang || !res.locals.ttlangs[req.params.lang])
					return this.menu();

				if (req.params.collection)
					return this.collection();

				this.collections();
			})
			.catch(next);
	}

	menu() {
		const rest = this.req.path.match(/^\/translate\/.{2}(\/[^\.]+\.[^\/]+\/[^\/]+)$/);

		this.locals.rest = rest ? rest[1] : '';
		this.locals.page = 'translate-lang';

		const referer = this.req.get('referer');

		if(referer && referer.indexOf(this.req.fullUri) === -1)
			this.req.session.translateReferer = referer;

		this.locals.backBtn = this.req.session.translateReferer;

		return this.send('lang-translate');
	}

	stats(next) {
		const req = this.req;
		const query = {};
		const db = req.db;

		if (req.query.uid && req.query.uid !== 'all')
			query.uid = req.query.uid;

		this.locals.page = 'translate-stats';

		req.ml
			.load('ecms-calendar')
			.then(() => {
				const c = req.ml.all;

				const monthNames = [
					c._CAL_JANUARY,
					c._CAL_FEBRUARY,
					c._CAL_MARCH,
					c._CAL_APRIL,
					c._CAL_MAY,
					c._CAL_JUNE,
					c._CAL_JULY,
					c._CAL_AUGUST,
					c._CAL_SEPTEMBER,
					c._CAL_OCTOBER,
					c._CAL_NOVEMBER,
					c._CAL_DECEMBER
				];

				return db.translated
					.wordsByMonth(query)
					.then(wbm => {
						const langs = {};

						Object.each(req.res.locals.ttlangs, (code, name) => {
							langs[code] = {
								total: 0,
								name: name
							};
						});

						wbm.forEach(t => {
							t.name = monthNames[t.month];

							Object.each(t.langs, (code, c) => {
								if (langs[code])
									langs[code].total += c;
							});
						});

						Object.each(langs, (code, v) => {
							if (!v.total)
								delete langs[code];
						});

						this.locals.tLangs = langs;
						this.locals.months = wbm;
					}).then(db.translated.distinct.bind(req.db.translated, 'uid', query))
					.then(uids => db.user.getList({_id: {$in: uids}}))
					.then(ulist => {
						this.locals.userList = ulist;
						this.locals.uid = req.query.uid;
						this.send('stats-translate');
					});
			})
			.catch(next);
	}

	item() {
		const req = this.req;
		const res = req.res;
		const col = this.col;

		return col.findById(req.params.itemid, ['title'].concat(this.fields).join(' '))
			.then(obj => {
				return req.db.translated
					.getFields(req.params.itemid, this.locals.toLang)
					.then(translated => {
						let r = obj.getValues4Edit();
						let fields = {};
						let tree = col.schema.tree;

						this.fields.forEach(k => {
							const src = r.vars[k] && r.vars[k][req.ml.configLang];

							if(!src)
								return;

							fields[k] = {
								caption: req.ml.all[tree[k].caption] || tree[k].caption,
								desc: tree[k].description
							};

							fields[k].from = src;
							fields[k].to = r.vars[k] && r.vars[k][req.params.lang];
							fields[k].translated = translated.indexOf(k) !== -1;
							fields[k].words = wordCount(fields[k].from);
						});

						res.locals.item = {
							title: obj.title,
							fields: fields
						};

						this.send('item-translate');
				});
			});
	}

	collection() {
		this.locals.page = 'translate-collections';

		const req = this.req;
		const res = req.res;
		const split = req.params.collection.match(/^([^\.]+)\.(.+)$/);
		const dbname = this.locals.db = split[1];
		const colname = this.locals.collection = split[2];
		const col = req.site.dbs[dbname][colname];

		this.locals.collectionTitle = col.colTitle(req.ml.lang);
		this.fields = col.translatableFieldList();

		Object.defineProperty(this, 'col', {value: col});

		if (req.params.itemid)
			return this.item();

		let query = {
			dbname: col.db.name,
			colname: col.modelName,
			to: req.params.lang
		};

		req.db.translated.getFieldCountById(query, (err, translated) => {
			translated = translated[col.db.name + '.' + col.modelName] || {};

			query = {};

			if (!this.locals.activeAll)
				query.active = true;

			const dateField = 'created'; //col.schema.tree.published ? 'published' : 'modified';
			const identifier = col.schema.options.identifier;
			let projection = Object.keys(col.schema.options.list_order).concat(this.fields);

			if(projection.indexOf(identifier) === -1)
				projection.push(identifier);

			if(projection.indexOf(dateField) === -1)
				projection.push(dateField);

			col
				.find(query, projection.join(' '))
				.sort(col.schema.options.list_order)
				.then(r => {
					const items = [];

					r.forEach(rr => {
						let fromFields = 0;

						this.fields.forEach(k => {
							if(rr[k] && rr[k][req.ml.configLang])
								fromFields++;
						});

						items.push({
							id: rr.id,
							title: rr[identifier],
							date: rr[dateField] && rr[dateField].toUserDateString(),
							done: translated[rr.id] >= fromFields ? '&#10003;' : '',
							count: fromFields
						});
					});

					res.locals.items = items;

					this.send('col-translate');
				})
				.catch(this.next.bind(this));
		});
	}

	collections() {
		this.locals.page = 'translate-collections';

		const req = this.req;
		const res = this.req.res;

		let collections = [];

		this.dbs.forEach(dbname => {
			let _db = this.req.site.dbs[dbname];

			_db.dynobject.schema.statics.getKeys().forEach(key => {
				if (_db[key].schema.options.showTranslate)
					collections.push(_db[key]);
			});
		});

		if (!collections.length)
			return this.page.send();

		let count = 0;

		req.res.locals.cols = {};

		req.db.translated.getFieldCountById(req.params.lang, function (err, translated) {
			collections.forEach(function (col) {
				const k = col.db.name + '.' + col.modelName;

				(function (k) {
					const fields = col.translatableFieldList();

					if (!fields.length)
						return _finish(k);

					col.find({active: true}, '_id', function (err, result) {
						if (result.length) {
							let translatedCount = 0;

							if (translated[k]) {
								result.forEach(function (r) {
									if (translated[k][r.id])
										translatedCount++;
								});
							}

							res.locals.cols[k] = {
								title: col.modelName,//col.colTitle(req);
								count: translatedCount + '/' + result.length
							};
						}

						_finish(k);
					});
				})(k);
			});
		});


		let _finish = k => {
			if (++count === collections.length)
				this.send('home-translate');
		};

	}

	send(view) {
		this.page
			.init({
				jQueryMobile: true,
				jQueryMobileTheme: 'default',
				jQueryUI: true,
				title: 'Site translate page',
				sitelogo: true,
				layout: 'translate',
				userLevel: 2,
				userType: 'translator',
				view: 'admin/translate/' + view
			})
			.then(() => {
				this.req.res.set('Cache-Control', 'no-cache, must-revalidate');

				this.page.head
					.addJS('translate-page')
					.addCSS('layout-mobile')
					.addCSS('translate-page');

				return this.page.send();
			});
	}

	next(err){
		this.req.next(err);
	}
}

module.exports = function(req, res, next){
	if (Object.keys(req.site.langs).length < 2)
		return res.send('Este sitio web no es multilingüe');

//	req.db.translated.setWC();//word counters

	return new TransPage(req, res, next);
};