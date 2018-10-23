import {Site} from "./modules";

export const updates = (site: Site, version: string) => {

	switch (version) {
		case '1.6.1':
		case '1.6.2':
		case '1.6.3':
		case '1.6.4':
			return site.db.config
				.remove({name: {$in: ['protocol', 'external_protocol']}})
				.then(() => ({ok: true}));

		case "1.7.4":
			return site.db._conn.collection('sessions').removeMany()
				.then(() => ({ok: true}));
		default:
			return Promise.resolve({ok: true});
	}
};
