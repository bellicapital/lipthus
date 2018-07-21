import {CssManager} from "./css";
import {JsManager} from "./js";
import {LipthusRequest, LipthusResponse} from "../../../index";

const fs = require('fs');
const Url = require('url');

export class HeadManager {

	public css: CssManager;
	public js: JsManager;
	public metas: Array<any> = [];
	public links: Array<any>;

	constructor(public req: LipthusRequest, res: LipthusResponse) {
		this.css = new CssManager(req, res);
		this.js = new JsManager(req, res);
		this.links = res.locals.headLinks = [];
	}

	get hreflangs() {
		return this.langUris();
	}

	addJS(src: Array<string> | string, opt?: any) {
		this.js.add(src, opt);

		return this;
	}

	addCSS(src: string, opt?: any) {
		this.css.add(src, opt);

		return this;
	}

	addJSVars(vars: any) {
		this.js.addVars(vars);

		return this;
	}

	addLink(obj: any) {
		this.links.push(obj);

		return this;
	}

	addMetaName(name: string, content: string) {
		this.addMeta({name: name, content: content});
	}

	addMetaProperty(property: string, content: string) {
		this.addMeta({property: property, content: content});
	}

	addMeta(meta: any) {
		this.metas.push(meta);
	}

	removeLink(obj: any) {
		const idx = this.links.findIndex(ln => ln.href === obj.href && ln.rel === obj.rel);

		if (idx !== -1)
			this.links.splice(idx, 1);

		return this;
	}

	langUris(url?: string) {
		const req = this.req;

		if (Object.keys(req.site.langUrls).length <= 1)
			return;

		const ret: { [s: string]: string } = {};

		if (!url) {
			url = req.url;

			if (req.xhr) {
				const referer = req.get('Referer');

				if (referer)
					url = Url.parse(referer).path;
			}
		}

		Object.keys(req.site.langUrls).forEach(code => ret[code] = req.protocol + ':' + req.site.langUrls[code] + url);

		return ret;
	}

	jQueryPlugin(name: string, opt?: any) {
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

	addJSLang(a: any) {
		return this.js.addLangVars(a);
	}

	addGMap() {
		this.js
			.add('form/formLocation.js')
			.add('gmap/gmap.js')
			.add('gmap/autocomplete.js');

		return this;
	}

	formScriptsMobile() {
		this.js
			.add('image.js')
			.add('video.js')
			.add('progressbar.js')
			.add('form/formfile.js')
			.add('form/filefield.js')
			.add('form/jquery.html5uploader.js')
			.add('form/mobileform.js');

		this.css.add('form');

		return this.req.ml.langUserNames()
			.then((names: any) => {
				this.addJSVars({langNames: names});

				(this.req as any).res.locals.userLangNames = names;

				return this;
			});
	}

	formScripts(level: number, multilang = true) {
		if (level === undefined || level === null)
			level = 2;

		// noinspection FallThroughInSwitchStatementJS
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
				// this.js.add('uploader.js');
				this.js.add('form/formWatermark.js');
				this.js.add('form/formfile.js');
				this.js.add('form/signature.js');
			default:
				this.jQueryPlugin('rte');
				this.jQueryPlugin('tablesorter', 'ui');
				this.jQueryPlugin('mobiscroll');
				this.css.add('form', 20);

				// this.css.add('ui.selectmenu');
				// this.js.add('ui.selectmenu.js');

				let f = 'language/' + this.req.ml.lang + '/lang.js';

				if (!fs.existsSync(this.req.site.dir + '/js/' + f))
					f = 'language/es/lang.js';

				this.js.add(f);
				this.js.add('eucaselectable.js');

				if (multilang && (Object.keys(this.req.ml.langs).length > 1))
					this.js.add('langselector.js');

				this.js.add('form/form.js');
				this.js.add('item.js');

				this.req.ml.load('ecms-misc').then((r: any) => {
					this.js.addLangVars(r);
				});
		}

		return this;
	}
}
