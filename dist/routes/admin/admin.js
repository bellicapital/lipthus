"use strict";

module.exports = function(req, res, next){
	res.htmlPage
		.init({
			userLevel: 2,
			title: req.site.config.sitename + ' admin',
			sitelogo: true,
			view: 'admin',
			layout: 'admin',
			userNav: true
		})
		.then(page => {
			page.head
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
					'itemtree.js',
					'gtable.js',
					'ui.panel.js',
					'admin/admin_bots.js',
					'admin/admin_config.js',
					'admin/admin_db.js',
					'admin/admin_user.js',
					'admin/admin_page.js',
					'admin/admin_search.js',
					'admin/admin_menu.js',
					'admin/admin_facebook.js',
					'admin/admin_maintenance.js',
					'admin/admin_wss.js',
					'admin/admin_errors.js',
					'admin/admin_notfound.js'])
				.formScripts(2)
				.addCSS('panel')
				.addCSS('admin')
		})
		.then(() => req.ml.availableLangNames())
		.then(langNames => res.htmlPage.addJSVars({langNames: langNames, translatorLangs: req.ml._allLangNames}))
		.then(() => res.htmlPage.send())
		.catch(next);
};
