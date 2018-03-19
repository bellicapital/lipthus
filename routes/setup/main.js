"use strict";

const DeviceParser = require('express-device').Parser;

// noinspection JSUnusedGlobalSymbols
const Admin = {
	main (req){
		const config = req.site.config;
		const ret = {
			sitename: req.site + '',
			language: config.language,
			user: req.user && req.user.baseInfo() || undefined,
			registerMethods: req.site.registerMethods
		};

		return req.ml.langUserNames()
			.then(ln => ret.languages = ln)
			.then(() => req.site.db.dynobject.getItemsArray(req))
			.then(items => {
				ret.handlers = items.handlers;
				ret.menus = items.menus;
			})
			.then(() => req.ml.timeZoneList())
			.then(tzl => ret.timeZ = tzl)
			.then(() => req.ml.load('ecms-config'))
			.then(() => Admin.configGroupList(req))
			.then(groupNames => ret.configGroupList = groupNames)
			.then(() => Admin.getMisc(req))
			.then(misc => ret.misc = misc)
			.then(() => Admin.getCustom(req))
			.then(custom => ret.custom = custom)
			.then(() => Admin.getThemes(req))
			.then(themes => ret.themes = themes)
			.then(() => ret);
	},
	configGroupList(req){
		const all = req.ml.all;
		const groups = req.site.config.groups;
		const groupNames = {};

		Object.keys(groups).forEach(i => groupNames[i] = all[groups[i].title] || groups[i].title);

		return groupNames;
	},
	getMisc (req){
		return req.logger.count('error')
			.then(errCount => {
				//TODO
				return {
					'rss': {
						'list': {},//Page::rssList(),
						'theme': req.site.config.theme_set
					},
					'robots': '',//file_get_contents('robots.txt'),
					'errors': errCount,
					'notfound': 0,//Logger::col()->notfound->find()->count(),
					'cache': 0//Cache::col()->count()
				};
			});
	},
	getCustom (req){
		const conf = req.site.conf.adminMenus;

		if(!conf || !conf.length)
			return;

		const ret = [];
		const lang = req.ml.lang;
		const configLang = req.ml.configLang;
		const uLevel = req.user && req.user.level || 0;

		req.site.conf.adminMenus.forEach(r => {
			if(r.userLevel <= uLevel)
				ret.push({
					caption: r.caption[lang] || r.caption[configLang] || r.caption,
					url: r.url
				});
		});

		return ret;
	},
	getThemes(){
		return [];//fs.getDirListAsArray('themes')
	},
	wss (req){
		const wss = req.app.wss;
		const paths = {};

		wss.clients.forEach(c => {
			const parser = new DeviceParser({headers: c.upgradeReq.headers});

			if(!paths[c.upgradeReq.url])
				paths[c.upgradeReq.url] = [];

			paths[c.upgradeReq.url].push({
				host: c.upgradeReq.headers.host,
				origin: c.upgradeReq.headers.origin,
				key: c.upgradeReq.headers['sec-websocket-key'],
				version: c.upgradeReq.headers['sec-websocket-version'],
				device: parser.get_type()
			});
		});

		return paths;
	},
	doList: req => {
		const model = req.db[req.body.colname];
		let identifier = model.schema.options.identifier;
		const multilang = !!model.schema.tree[identifier].multilang;

		if(multilang)
			identifier += '.' + req.ml.lang;

		return req.db[req.body.colname].find()
			.sort(identifier)
			.select(identifier + ' active')
			.then(r => r);
	}
};

module.exports = Admin;
