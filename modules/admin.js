"use strict";

const DeviceParser = require('express-device').Parser;

const Admin = {
	start (req){
		const ret = {};

		return req.site.db.dynobject
			.getItemsArray(req)
			.then(items => ret.handlers = items)
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
		const uLevel = req.user && req.User.level || 0;

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
	getGroupConfigs4Edit (groupName){
		const ret = {};
		const req = this.req;

		return req.ml
			.load(['ecms-config', 'ecms-comment', 'ecms-user', 'ecms-misc', 'ecms-shopping'])
			.then(() => req.site.config.getConfigsByCat(groupName))
			.then(configs => {
				if(Object.keys(configs).length) {
					return Promise.all(Object.keys(configs).map(name => {
						configs[name].get4Edit(req)
							.then(r => {
								ret[r.name] = r;
								delete r.name;
							});
					}));
				}
			})
			.then(() => ({
				group_name: groupName,
				configs: ret
			}));
	},
	wss (req, res, cb){
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
		
		cb(null, paths);
	},
	filterLang: (req, res, code, st, cb) => cb(new Error('TODO!')),
	errors: (req, res, p, cb) => req.logger.list('error', {}, p, cb)
};

module.exports = Admin;