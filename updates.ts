import {Site} from "./modules";

export default [
	{
		version: '1.6.4',
		updater: (site: Site) => site.db.config.remove({name: {$in: ['protocol', 'external_protocol']}})
	},
	{
		version: "1.7.4",
		updater: (site: Site) => site.db._conn.collection('sessions').removeMany()
	},
	{
		version: "1.8.0",
		updater: (site: Site) => Promise.resolve(site.db.name)
	}
];
