module.exports = function(req, res, next){
	
	res.htmlPage
		.init({
			jQueryMobile: true,
			jQueryMobileTheme: 'default',
			jQueryUI: true,
			title: 'Google Cloud Messenger tester',
			sitelogo: true,
			view: 'admin/gcm',
			layout: 'gcm',
			userLevel: 2
		})
		.then(() => {
			res.locals.googleApiKey = req.site.config.googleApiKey;

			res.locals.regid = req.body.regid || 'APA91bHUFaPHstNbslHy1gF6LHY93kDX_ReVy3MbuFijXTIfH_vRaMwtDSr_UK_us_YbfgpOLcazE-YBoYaDeQxVLjUEqAxC3wNKqKC5eWu2CFtAO72FB7uZhO5cFU_Rm5QYHkiIdCj1';//jj

			res.locals.params = {
				message: req.body.text || 'Prueba GCM',
				collapseKey: req.body.collapseKey || 'test',
				contentAvailable: req.body.contentAvailable === 'true' || false,
				delayWhileIdle: req.body.delayWhileIdle === 'true' || false,
				priority: req.body.priority || 'normal',
				timeToLive: parseInt(req.body.timeToLive) || 2419200,//default, 4 weeks
				dryRun: req.body.dryRun !== 'false'
			};

			if (req.method === 'POST')
				return req.site.notifier.gcm([res.locals.regid], res.locals.params)
					.then(result => res.locals.result = JSON.stringify(result, null, '\t'));
		})
		.then(() => res.htmlPage.send())
		.catch(next);
};

/*
 * 29a21e2728ce4ea1: {
			regId: "APA91bHUFaPHstNbslHy1gF6LHY93kDX_ReVy3MbuFijXTIfH_vRaMwtDSr_UK_us_YbfgpOLcazE-YBoYaDeQxVLjUEqAxC3wNKqKC5eWu2CFtAO72FB7uZhO5cFU_Rm5QYHkiIdCj1",
			prevType: "control",
			type: "control",
			description: "Juanjo",
			uuid: "29a21e2728ce4ea1",
			version: "5.1",
			model: "HUAWEI MT7-L09",
			registered: ISODate("2015-11-23T13:36:23.234Z"),
			platform: "Android"
		}
 */