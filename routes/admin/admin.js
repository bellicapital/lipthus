"use strict";

module.exports = function(req, res, next){
	res.htmlPage
		.init({
			userLevel: 2,
			jQueryUI: true,
			jQueryMobile: true,
			jQueryMobileTheme: 'base',
			uitheme: 'smoothness',
			jQueryUIcss: true,
			title: req.site.config.sitename + ' admin',
			sitelogo: true,
			view: 'admin',
			layout: 'admin',
			userNav: true
		})
		.then(page => {
			page.head
				.jQueryPlugin('cookie')
				.jQueryPlugin('hotkeys')
				.jQueryPlugin('jstree')
				.jQueryPlugin('tablesorter', 'ui')
				.addJS([
					'admin/admin.js',
					'item_admin.js',
					'handler.js',
					'itemtree.js',
					'user.js',
					'admin/admin_subscriptions.js',
					'gtable.js',
					'paginator.js',
					'ui.checkbox.js',
					'jquery.ui.tooltip.js',
					'itemtree.js',
					'gtable.js',
					'ui.panel.js',
					'admin/admin_bots.js',
					'admin/admin_config.js',
					'admin/admin_db.js',
					'admin/admin_user.js',
					'admin/admin_page.js',
					'admin/admin_misc.js',
					'admin/admin_search.js',
					'admin/admin_menu.js',
					'admin/admin_facebook.js',
					'admin/admin_maintenance.js',
					'admin/admin_helocheck.js',
					'admin/admin_wss.js',
					'admin/admin_errors.js',
					'admin/admin_notfound.js'])
				.formScripts(2)
				.addCSS('jquery.ui.tooltip')
				.addCSS('panel')
				.addCSS('admin')
		})
		.then(() => req.ml.availableLangNames())
		.then(langNames => res.htmlPage.addJSVars({langNames: langNames, translatorLangs: req.ml._allLangNames}))
		.then(() => res.htmlPage.send())
		.catch(next);
};