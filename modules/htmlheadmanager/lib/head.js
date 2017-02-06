"use strict";

const Css = require('./css');
const Js = require('./js');
const fs = require('fs');
const Url = require('url');

class HeadManager {
	constructor(req, res) {
		this.css = new Css(req, res);
		this.js = new Js(req, res);
		this.metas = [];
		this.links = res.locals.headLinks = [];

		Object.defineProperties(this, {
			req: {value: req},
			hreflangs: {
				get: () => this.langUris()
			}
		});
	}

	addJS(src, opt) {
		this.js.add(src, opt);

		return this;
	}

	addCSS(src, opt) {
		this.css.add(src, opt);

		return this;
	}

	addJSVars(vars) {
		this.js.addVars(vars);

		return this;
	}

	addLink(obj) {
		this.links.push(obj);

		return this;
	}

	addMetaName(name, content){
		this.addMeta({name: name, content: content});
	}

	addMetaProperty(property, content){
		this.addMeta({property: property, content: content});
	}

	addMeta(meta){
		this.metas.push(meta);
	}

	removeLink(obj) {
		this.links.forEach((ln, idx) => {
			this.links.splice(idx, 1);
		});

		return this;
	}

	langUris(url) {
		const req = this.req;
		let ret;

		if (Object.keys(req.site.langUrls).length > 1) {
			ret = {};

			if(!url) {
				url = req.url;

				if (req.xhr) {
					const referer = req.get('Referer');

					if (referer)
						url = Url.parse(referer).path;
				}
			}

			Object.keys(req.site.langUrls).forEach(code => ret[code] = req.protocol + ':' + req.site.langUrls[code] + url);
		}

		return ret;
	}

	jQueryMobile(theme) {
		this.js.jQueryMobile = true;
		this.css.jQueryMobile = true;

		if (theme)
			this.css.jQueryMobileTheme = theme;
	}

	jQueryPlugin(name, opt) {
		let dir = '/cms/js/jquery/plugins/';

		switch (name) {
			case 'tablesorter':
				this.js.add(dir + 'tablesorter/jquery.tablesorter.js');
				this.js.add(dir + 'tablesorter/addons/pager/jquery.tablesorter.pager.js');
				this.js.add(dir + 'tablesorter/eucawidgets.js');
				this.js.add(dir + 'jquery.metadata.js');

				this.css.add(dir + 'tablesorter/themes/' + (opt || 'ui') + '/style.css');
				this.css.add(dir + 'tablesorter/addons/pager/jquery.tablesorter.pager.css');
				break;
			case 'jstree':
				this.js.add(dir + 'jstree/jquery.jstree.js');
				break;
			case 'rte':
				this.js.add(dir + 'jquery.rte1_2/jquery.ocupload-1.1.4.js');
				this.js.add(dir + 'jquery.rte1_2/jquery.rte.js');
				this.js.add(dir + 'jquery.rte1_2/jquery.rte.tb.js');
				this.css.add(dir + 'jquery.rte1_2/jquery.rte.css');
				break;
			case 'mobiscroll':
				dir += 'mobiscroll-master/';
				opt = opt || {};
				opt.lang = opt.lang || this.req.ml.lang;
				opt.theme = opt.theme || 'ios';
				this.js.add(dir + 'js/mobiscroll.core.js', 21);
				this.js.add(dir + 'js/mobiscroll.datetime.js', 20);
				this.js.add(dir + 'js/mobiscroll.select.js', 20);
				this.js.add(dir + 'js/mobiscroll.' + opt.theme + '.js', 20);

				if (opt.lang !== 'en')
					this.js.add(dir + 'js/i18n/mobiscroll.i18n.' + opt.lang + '.js', 20);

				this.css.add(dir + 'css/mobiscroll.core.css');
				this.css.add(dir + 'css/mobiscroll.' + opt.theme + '.css');
				this.css.add(dir + 'css/mobiscroll.animation.css');
				break;
			default:
				this.js.add(dir + 'jquery.' + name + '.js', 20);
		}

		return this;
	}

	addJSLang(a) {
		return this.js.addLangVars(a);
	}

	datepicker() {
		if (this.js.jQueryMobile && !this.js.jQueryUi) {
			this.js.datepicker = true;
			this.css.add('jquery.mobile.datepicker');
		}

		return this;
	}

	addGMap(level, multilang, cb) {
		this.js
			.add('form/formLocation.js')
			.add('gmap/gmap.js')
			.add('gmap/autocomplete.js');

		return this;
	}

	formScriptsMobile() {
		this.datepicker()
			.js
			.add('image.js')
			.add('video.js')
			.add('progressbar.js')
			.add('form/formfile.js')
			.add('form/filefield.js')
			.add('form/jquery.html5uploader.js')
			.add('form/mobileform.js');

		this.css.add('form');

		return new Promise((ok, ko) => {
			this.req.ml.langUserNames().then(names => {
				this.addJSVars({langNames: names});

				this.req.res.locals.userLangNames = names;

				ok(this);
			});
		});
	}

	formScripts(level, multilang, cb) {
		if (level === undefined || level === null)
			level = 2;

		if (multilang === undefined)
			multilang = true;

		switch (level) {
			case 2:
				this.js.add('form/formLocation.js');
				this.js.add('gmap/gmap.js');
			case 1:
				if (this.req.ml.translateAvailable())
					this.js.add('translate.js');

				this.jQueryPlugin('html5uploader');
				this.css.add('videos');
				this.css.add('uploader');
				this.js.add('video.js');
				this.js.add('admin/admin_video.js');
				this.js.add('thumb.js');
//				this.js.add('uploader.js');
				this.js.add('form/formWatermark.js');
				this.js.add('form/formfile.js');
				this.js.add('form/signature.js');
			default:
				this.datepicker();

				this.jQueryPlugin('rte');
				this.jQueryPlugin('tablesorter', 'ui');
				this.jQueryPlugin('mobiscroll');
				this.css.add('form', 20);

//			this.css.add('ui.selectmenu');
//			this.js.add('ui.selectmenu.js');

				let f = 'language/' + this.req.ml.lang + '/lang.js';

				if (!fs.existsSync(this.req.site.dir + '/js/' + f))
					f = 'language/es/lang.js';

				this.js.add(f);
				this.js.add('eucaselectable.js');

				if (multilang && (Object.keys(this.req.ml.langs).length > 1))
					this.js.add('langselector.js');

				this.js.add('form/form.js');
				this.js.add('item.js');

				this.req.ml.load('ecms-misc').then(r => {
					this.js.addLangVars(r);

					cb && cb();
				});
		}

		return this;
	}

	photoswipe(skin, ui) {
		this.css.addBower('photoswipe', 'photoswipe.css', {deferred: true});
		this.js.addBower('photoswipe', 'photoswipe.min.js');

		if (skin) {
			if (skin === true)
				skin = 'default';

			this.css.addBower('photoswipe', skin + '-skin/' + skin + '-skin.css');
			this.js.addBower('photoswipe', 'photoswipe-ui-' + (ui || skin) + '.min.js');
		}

		return this;
	}
}


module.exports = HeadManager;