import {Site} from "./modules";

export default [
	{
		version: '1.6.4',
		updater: (site: Site) => site.db.config.remove({name: {$in: ['protocol', 'external_protocol']}})
	},
	{
		version: "1.7.4",
		updater: (site: Site) => site.db._conn.collection('sessions').deleteMany({})
	},
	{
		version: "1.8.0",
		// It removes cart default null
		updater: (site: Site) => site.db.user.updateMany({cart: null}, {$unset: {cart: true}})
	}
];
